using backend.Data;
using backend.interfaces;
using backend.Models;
using backend.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Services
{
    public class AuctionService : IAuctionService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<AuctionHub> _hub;

        // Thread Safety Lock (Atomic processing for bids)
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        // IN-MEMORY STATUS
        private List<AuctionState> _activeAuctions = new List<AuctionState>();
        private List<int> _productQueue = new List<int>();
        private bool _isQueueRunning = false;

        public AuctionService(IServiceScopeFactory scopeFactory, IHubContext<AuctionHub> hub)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
        }

        public async Task TimeoutAuction(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            if (auction != null && auction.IsRunning)
            {
                auction.IsRunning = false;

                // Stuur bericht: Niet verkocht
                await _hub.Clients.All.SendAsync("ReceiveAuctionResult", new
                {
                    productId = productId,
                    sold = false,
                    price = auction.CurrentPrice
                });

                // Als de queue aan staat, ga door
                if (_isQueueRunning)
                {
                    _ = Task.Run(async () => {
                        await Task.Delay(5000);
                        await StartNextInQueue();
                    });
                }
            }
        }

        public void AddToQueue(List<int> productIds)
        {
            // VALIDATION: Allow products scheduled for today or earlier
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var today = DateTime.Today;

                var validIds = context.Producten
                    .Where(p => productIds.Contains(p.ProductID) &&
                                p.BeginDatum.HasValue &&
                                p.BeginDatum.Value.Date <= today &&
                                p.Aantal > 0 &&
                                p.IsAuctionable)
                    .Select(p => p.ProductID)
                    .ToList();

                foreach (var id in validIds)
                {
                    if (!_productQueue.Contains(id)) _productQueue.Add(id);
                }
            }
        }

        public void RemoveFromQueue(int productId)
        {
            if (_productQueue.Contains(productId))
            {
                _productQueue.Remove(productId);
            }
        }

        public List<int> GetQueueIds()
        {
            return new List<int>(_productQueue);
        }

        public AuctionState? GetActiveAuction()
        {
            return _activeAuctions.FirstOrDefault(a => a.IsRunning);
        }

        public async Task StartQueueAsync()
        {
            _isQueueRunning = true;
            await StartNextInQueue();
        }

        private async Task StartNextInQueue()
        {
            if (!_isQueueRunning) return;

            if (_productQueue.Count > 0)
            {
                int nextId = _productQueue[0];
                _productQueue.RemoveAt(0);
                await StartAuctionAsync(nextId);
            }
            else
            {
                _isQueueRunning = false;
            }
        }

        public async Task StartAuctionAsync(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            if (auction == null)
            {
                auction = new AuctionState { ProductId = productId };
                _activeAuctions.Add(auction);
            }

            auction.IsRunning = true;
            auction.IsSold = false;
            auction.StartTime = DateTime.Now;
            auction.BuyerName = null;
            auction.FinalPrice = 0;

            // 1. Fetch Start Price from DB
            decimal startPrijs = 0;
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var product = await db.Producten.FindAsync(productId);

                if (product != null)
                {
                    startPrijs = (decimal)product.StartPrijs;
                    auction.MinPrice = product.MinPrijs ?? 0;
                }
            }

            // 2. Initialize the in-memory current price
            auction.CurrentPrice = startPrijs;
            auction.StartPrice = startPrijs; // Ensure StartPrice is set for the TickerService

            // 3. Send SignalR update including startPrijs
            await _hub.Clients.All.SendAsync("ReceiveNewAuction", new
            {
                productId = productId,
                startTime = auction.StartTime,
                startPrijs = startPrijs
            });
        }

        public AuctionState GetStatus(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            return auction ?? new AuctionState { ProductId = productId, IsRunning = false };
        }

        public async Task<bool> PlaatsBod(int productId, string koperNaam, string koperId, int aantal)
        {
            await _semaphore.WaitAsync();
            try
            {
                var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);

                if (auction == null || !auction.IsRunning || auction.IsSold) return false;

                var duration = TimeSpan.FromSeconds(30); // OOK 30 seconden
                var elapsed = DateTime.Now - auction.StartTime;

                double progress = elapsed.TotalMilliseconds / duration.TotalMilliseconds;
                progress = Math.Max(0, Math.Min(1, progress));

                // Formule: Start - ((Start - Min) * Progress)
                decimal start = auction.StartPrice;
                decimal min = auction.MinPrice;
                decimal exactPrijs = start - ((start - min) * (decimal)progress);

                // Afronden op 2 decimalen
                exactPrijs = Math.Round(exactPrijs, 2);

                // Opslaan
                auction.CurrentPrice = exactPrijs;
                auction.FinalPrice = exactPrijs;
                // -----------------------------------------------------

                // Update Status
                auction.IsRunning = false;
                auction.IsSold = true;
                auction.BuyerName = koperNaam;

                // Database logic
                using (var scope = _scopeFactory.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var prod = await context.Producten.FindAsync(productId);

                    if (prod == null || prod.Aantal < aantal)
                    {
                        auction.IsRunning = true;
                        auction.IsSold = false;
                        return false;
                    }

                    // Voorraad update
                    prod.Aantal -= aantal;
                    string sellerId = prod.VerkoperID ?? "";
                    string productName = prod.Naam;

                    // Restpartij logica
                    if (prod.Aantal > 0)
                    {
                        if (!_productQueue.Contains(productId)) _productQueue.Insert(0, productId);
                    }

                    // Opslaan in DB met de BEREKENDE prijs
                    var veiling = new Veiling
                    {
                        ProductID = productId,
                        VerkoopPrijs = (float)auction.FinalPrice, // <--- Dit is nu de exacte prijs
                        Aantal = aantal,
                        StartDatumTijd = auction.StartTime,
                        EindTijd = elapsed,
                        VerkoperID = sellerId,
                        KoperId = koperId
                    };
                    context.Veilingen.Add(veiling);

                    if (prod.Aantal <= 0)
                    {
                        prod.IsAuctionable = false;
                        prod.Aantal = 0;
                    }
                    await context.SaveChangesAsync();

                    // SignalR Update
                    await _hub.Clients.All.SendAsync("ReceiveAuctionResult", new
                    {
                        productId = productId,
                        sold = true,
                        buyer = koperNaam,
                        price = auction.FinalPrice,
                        amount = aantal,
                        sellerId = sellerId,
                        productName = productName
                    });
                }

                // Auto-Play
                if (_isQueueRunning)
                {
                    _ = Task.Run(async () => {
                        await Task.Delay(5000);
                        await StartNextInQueue();
                    });
                }

                return true;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task ForceNextAsync()
        {
            var active = _activeAuctions.FirstOrDefault(a => a.IsRunning);
            if (active != null)
            {
                active.IsRunning = false;
            }
            _isQueueRunning = true;
            await StartNextInQueue();
        }

        public async Task MoveNewAuctionableProductsAsync(CancellationToken ct = default)
        {
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var newProds = await context.Producten
                    .Where(p => p.StartPrijs != 0 &&
                                !p.IsAuctionable &&
                                p.Aantal > 0 &&
                                p.KoperID == null)
                    .ToListAsync(ct);

                if (!newProds.Any()) return;
                foreach (var p in newProds) p.IsAuctionable = true;
                await context.SaveChangesAsync(ct);
            }
        }

        public async Task CreateQueueAsync() { await Task.CompletedTask; }
        public async Task StartnextAuctionAsync() { await Task.CompletedTask; }
    }
}