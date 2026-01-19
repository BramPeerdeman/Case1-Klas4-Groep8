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

        // Thread Safety Lock (Atomic processing for bids AND list management)
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);
        
        // Lock object specifically for the _activeAuctions list to prevent crashes with PriceTicker
        private readonly object _listLock = new object();

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
            AuctionState? auction;
            lock (_listLock) 
            {
                auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            }

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

                await _hub.Clients.All.SendAsync("RefreshProducts");

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
            // VALIDATION: Allow products scheduled for today or earlier (Timezone Safe)
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                
                // FIX 1: Get 'Today' in Dutch Time (CET)
                // If on Linux/Docker, use "Europe/Amsterdam", on Windows "W. Europe Standard Time"
                // Using a safe fallback approach:
                var utcNow = DateTime.UtcNow;
                var cetZone = TimeZoneInfo.FindSystemTimeZoneById(Environment.OSVersion.Platform == PlatformID.Unix ? "Europe/Amsterdam" : "W. Europe Standard Time");
                var todayInHolland = TimeZoneInfo.ConvertTimeFromUtc(utcNow, cetZone).Date;

                var validIds = context.Producten
                    .Where(p => productIds.Contains(p.ProductID) &&
                                p.BeginDatum.HasValue &&
                                p.BeginDatum.Value.Date <= todayInHolland && // Used corrected date
                                p.Aantal > 0 &&
                                p.IsAuctionable)
                    .Select(p => p.ProductID)
                    .ToList();

                lock (_listLock) // Safety for queue list
                {
                    foreach (var id in validIds)
                    {
                        if (!_productQueue.Contains(id)) _productQueue.Add(id);
                    }
                }
            }
        }

        public void RemoveFromQueue(int productId)
        {
            lock (_listLock)
            {
                if (_productQueue.Contains(productId))
                {
                    _productQueue.Remove(productId);
                }
            }
        }

        public List<int> GetQueueIds()
        {
            lock (_listLock)
            {
                return new List<int>(_productQueue);
            }
        }

        public AuctionState? GetActiveAuction()
        {
            lock (_listLock)
            {
                return _activeAuctions.FirstOrDefault(a => a.IsRunning);
            }
        }

        public async Task StartQueueAsync()
        {
            _isQueueRunning = true;
            await StartNextInQueue();
        }

        private async Task StartNextInQueue()
        {
            if (!_isQueueRunning) return;

            int nextId = 0;
            bool hasNext = false;

            lock (_listLock)
            {
                if (_productQueue.Count > 0)
                {
                    nextId = _productQueue[0];
                    _productQueue.RemoveAt(0);
                    hasNext = true;
                }
                else
                {
                    _isQueueRunning = false;
                }
            }

            if (hasNext)
            {
                await StartAuctionAsync(nextId);
            }
        }

        public async Task StartAuctionAsync(int productId)
        {
            AuctionState auction;

            // FIX 2: Lock the list modification
            lock (_listLock)
            {
                auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
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
            }

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
            auction.StartPrice = startPrijs; 

            // 3. Send SignalR update including startPrijs
            await _hub.Clients.All.SendAsync("ReceiveNewAuction", new
            {
                productId = productId,
                startTime = auction.StartTime,
                startPrijs = startPrijs
            });
            // In StartAuctionAsync
            await _hub.Clients.All.SendAsync("RefreshProducts");
        }

        public AuctionState GetStatus(int productId)
        {
            lock (_listLock)
            {
                var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
                return auction ?? new AuctionState { ProductId = productId, IsRunning = false };
            }
        }

        public async Task<bool> PlaatsBod(int productId, string koperNaam, string koperId, int aantal)
        {
            await _semaphore.WaitAsync();
            try
            {
                var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);

                // Check if auction is valid in memory
                if (auction == null || !auction.IsRunning || auction.IsSold) return false;

                // 1. Update Status in memory (Stop the clock immediately)
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

                    sellerId = prod.VerkoperID ?? "";
                    productName = prod.Naam;

                    // Deduct Stock
                    prod.Aantal -= aantal;
                    string sellerId = prod.VerkoperID ?? "";
                    string productName = prod.Naam;

                    // Restpartij logica
                    if (prod.Aantal > 0)
                    {
                        // MODIFIED: Inject at index 0 to sell remaining stock immediately
                        if (!_productQueue.Contains(productId))
                        {
                            _productQueue.Insert(0, productId);
                        }
                    }

                    // Veiling loggen (Permanent Receipt)
                    var veiling = new Veiling
                    {
                        ProductID = productId,
                        // STRICT ENFORCEMENT: Use Server Price, not Client Price
                        VerkoopPrijs = (float)auction.FinalPrice,
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

                // 3. SignalR Update (Live scherm)
                await _hub.Clients.All.SendAsync("ReceiveAuctionResult", new
                {
                    productId = productId,
                    sold = true,
                    buyer = koperNaam,
                    price = auction.FinalPrice, // Send enforced server price
                    amount = aantal,
                    sellerId = sellerId,
                    productName = productName
                });

                // 4. Auto-Play Logic
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
            lock (_listLock)
            {
                var active = _activeAuctions.FirstOrDefault(a => a.IsRunning);
                if (active != null)
                {
                    active.IsRunning = false;
                }
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