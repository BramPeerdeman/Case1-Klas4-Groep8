using backend.Hubs;
using backend.interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;

namespace backend.Services
{
    public class PriceTickerService : BackgroundService
    {
        private readonly IHubContext<AuctionHub> _hub;
        private readonly IAuctionService _auctionService;

        public PriceTickerService(IHubContext<AuctionHub> hub, IAuctionService auctionService)
        {
            _hub = hub;
            _auctionService = auctionService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Wait for application startup
            await Task.Delay(2000, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var activeAuction = _auctionService.GetActiveAuction();

                    // Check if there is an active, running auction
                    if (activeAuction != null && activeAuction.IsRunning && !activeAuction.IsSold)
                    {
                        // Calculate elapsed time in seconds
                        var elapsed = DateTime.Now - activeAuction.StartTime;

                        // Define price drop rate (e.g., 1.00 per second)
                        decimal dropRatePerSecond = 1.00m;

                        // Calculate how much the price should have dropped by now
                        decimal priceDrop = (decimal)elapsed.TotalSeconds * dropRatePerSecond;

                        // Calculate new price based on the fixed StartPrice
                        decimal newPrice = activeAuction.StartPrice - priceDrop;

                        // Ensure we don't drop below the minimum price
                        if (newPrice < activeAuction.MinPrice)
                        {
                            newPrice = activeAuction.MinPrice;
                        }

                        // Update the shared state
                        activeAuction.CurrentPrice = newPrice;

                        // Send update to frontend
                        await _hub.Clients.All.SendAsync("PrijsUpdate", activeAuction.CurrentPrice, cancellationToken: stoppingToken);

                        // Check if we hit the bottom (Timeout)
                        if (activeAuction.CurrentPrice <= activeAuction.MinPrice)
                        {
                            await _auctionService.TimeoutAuction(activeAuction.ProductId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ticker Error: {ex.Message}");
                }

                // Wait 1 second before next update. 
                // Since we calculate based on timestamps, this delay only affects the 
                // "framerate" of updates, not the accuracy of the price.
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
}