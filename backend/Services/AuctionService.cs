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

        // IN-MEMORY STATUS
        private List<AuctionState> _activeAuctions = new List<AuctionState>();
        private List<int> _productQueue = new List<int>();
        private bool _isQueueRunning = false;

        public AuctionService(IServiceScopeFactory scopeFactory, IHubContext<AuctionHub> hub)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
        }

        public void AddToQueue(List<int> productIds)
        {
            // VALIDATION: Only allow products scheduled for today
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var today = DateTime.Today;

                var validIds = context.Producten
                    .Where(p => productIds.Contains(p.ProductID) &&
                                p.BeginDatum.HasValue &&
                                p.BeginDatum.Value.Date == today)
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

            decimal startPrijs = 0;
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var product = await db.Producten.FindAsync(productId);
                if (product != null) startPrijs = (decimal)product.StartPrijs;
            }

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

        // --- UPDATED METHOD ---
        public async Task<bool> PlaatsBod(int productId, string koperNaam, decimal bedrag, string koperId, int aantal)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);

            // Check if auction is valid in memory
            if (auction == null || !auction.IsRunning || auction.IsSold) return false;

            // 1. Update Status in memory (Stop the clock immediately to prevent double clicks)
            auction.IsRunning = false;
            auction.IsSold = true;
            auction.BuyerName = koperNaam;
            auction.FinalPrice = bedrag;

            // 2. Database Operations
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // Fetch product to check stock
                var prod = await context.Producten.FindAsync(productId);

                // Validation: Product must exist and have enough stock
                if (prod == null || prod.Aantal < aantal)
                {
                    // Rollback memory state if validation fails
                    auction.IsRunning = true;
                    auction.IsSold = false;
                    return false;
                }

                // Deduct Stock
                prod.Aantal -= aantal;

                // Veiling loggen
                var veiling = new Veiling
                {
                    ProductID = productId,
                    VerkoopPrijs = (float)bedrag,
                    Aantal = aantal, // Save the amount bought
                    StartDatumTijd = auction.StartTime,
                    EindTijd = DateTime.Now - auction.StartTime,
                    VerkoperID = prod.VerkoperID ?? "0",
                    KoperId = koperId
                };
                context.Veilingen.Add(veiling);

                // Update Product status
                prod.KoperID = koperId;
                prod.EindDatum = DateTime.Now;
                prod.Eindprijs = (float)bedrag;

                // If stock is empty, it is no longer auctionable. 
                // If stock remains, it stays auctionable (for a future run), but this specific run ends.
                if (prod.Aantal <= 0)
                {
                    prod.IsAuctionable = false;
                    prod.Aantal = 0; // Prevent negative numbers just in case
                }

                await context.SaveChangesAsync();
            }

            // 3. SignalR Update (Live scherm) - Include amount in broadcast
            await _hub.Clients.All.SendAsync("ReceiveAuctionResult", new
            {
                productId = productId,
                sold = true,
                buyer = koperNaam,
                price = bedrag,
                amount = aantal // Send amount to frontend
            });

            // 4. Auto-Play Logica
            if (_isQueueRunning)
            {
                _ = Task.Run(async () =>
                {
                    await Task.Delay(10000);
                    await StartNextInQueue();
                });
            }

            return true;
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
                var newProds = await context.Producten.Where(p => p.StartPrijs != 0 && !p.IsAuctionable).ToListAsync(ct);
                if (!newProds.Any()) return;
                foreach (var p in newProds) p.IsAuctionable = true;
                await context.SaveChangesAsync(ct);
            }
        }

        public async Task CreateQueueAsync() { await Task.CompletedTask; }
        public async Task StartnextAuctionAsync() { await Task.CompletedTask; }
    }
}