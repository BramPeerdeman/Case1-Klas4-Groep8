using backend.Data;
using backend.Hubs;
using backend.interfaces; // Required for IAuctionService
using backend.Models;     // Required for AuctionState
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using System.Threading;
using System.Threading.Tasks;

namespace backend.Services
{
    public class PriceTickerService : BackgroundService
    {
        private readonly IHubContext<AuctionHub> _hub;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IAuctionService _auctionService; // Inject AuctionService

        public PriceTickerService(
            IHubContext<AuctionHub> hub,
            IServiceScopeFactory scopeFactory,
            IAuctionService auctionService)
        {
            _hub = hub;
            _scopeFactory = scopeFactory;
            _auctionService = auctionService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Initial delay to ensure server is fully up
            await Task.Delay(2000, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // 1. Get the Active Auction from the Singleton Service
                    var activeAuction = _auctionService.GetActiveAuction();

                    // If no auction is running, or it's sold, just wait.
                    if (activeAuction == null || !activeAuction.IsRunning || activeAuction.IsSold)
                    {
                        await Task.Delay(1000, stoppingToken);
                        continue;
                    }

                    // 2. Retrieve Product Details (MinPrijs) from DB
                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        var product = await db.Producten
                            .AsNoTracking() // Optimization: Read-only access
                            .FirstOrDefaultAsync(p => p.ProductID == activeAuction.ProductId, stoppingToken);

                        if (product == null)
                        {
                            await Task.Delay(1000, stoppingToken);
                            continue;
                        }

                        decimal min = product.MinPrijs ?? 0m;
                        decimal current = activeAuction.CurrentPrice; // Read from Memory

                        // 3. Decrement Logic
                        if (current > min)
                        {
                            decimal next = current - 1m; // Decrement by 1
                            if (next < min) next = min;  // Cap at minimum

                            // 4. Update Memory State ONLY (Fixes DB destruction issue)
                            activeAuction.CurrentPrice = next;

                            // 5. Broadcast via SignalR
                            await _hub.Clients.All.SendAsync(
                                "PrijsUpdate",
                                next,
                                cancellationToken: stoppingToken
                            );
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log error to prevent the background service from crashing completely
                    Console.WriteLine($"Ticker Error: {ex.Message}");
                }

                // Wait 1 second before next tick
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
}