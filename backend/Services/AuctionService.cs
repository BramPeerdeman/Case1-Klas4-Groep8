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
        private List<int> _productQueue = new List<int>(); // Changed to List for easy removal
        private bool _isQueueRunning = false;

        public AuctionService(IServiceScopeFactory scopeFactory, IHubContext<AuctionHub> hub)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
        }

        public void AddToQueue(List<int> productIds)
        {
            foreach (var id in productIds)
            {
                if (!_productQueue.Contains(id)) _productQueue.Add(id);
            }
        }

        // --- NEW: Remove from Queue ---
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
                // Logic updated for List instead of Queue
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

        public async Task<bool> PlaatsBod(int productId, string koperNaam, decimal bedrag)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            if (auction == null || !auction.IsRunning || auction.IsSold) return false;

            auction.IsRunning = false;
            auction.IsSold = true;
            auction.BuyerName = koperNaam;
            auction.FinalPrice = bedrag;

            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var veiling = new Veiling
                {
                    ProductID = productId,
                    VerkoopPrijs = (float)bedrag,
                    StartDatumTijd = auction.StartTime,
                    EindTijd = DateTime.Now - auction.StartTime,
                    VerkoperID = 0
                };
                context.Veilingen.Add(veiling);

                var prod = await context.Producten.FindAsync(productId);
                if (prod != null) prod.IsAuctionable = false;

                await context.SaveChangesAsync();
            }

            await _hub.Clients.All.SendAsync("ReceiveAuctionResult", new
            {
                productId = productId,
                sold = true,
                buyer = koperNaam,
                price = bedrag
            });

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