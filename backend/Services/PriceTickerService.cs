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
            // Wacht even bij opstarten
            await Task.Delay(2000, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var activeAuction = _auctionService.GetActiveAuction();

                    // Check of er een actieve, lopende veiling is
                    if (activeAuction != null && activeAuction.IsRunning && !activeAuction.IsSold)
                    {
                        // Kan de prijs nog omlaag?
                        if (activeAuction.CurrentPrice > activeAuction.MinPrice)
                        {
                            decimal step = 1.00m; // Stapgrootte

                            // Bereken nieuwe prijs, maar nooit lager dan minimum
                            if (activeAuction.CurrentPrice - step < activeAuction.MinPrice)
                                activeAuction.CurrentPrice = activeAuction.MinPrice;
                            else
                                activeAuction.CurrentPrice -= step;

                            // Stuur update naar frontend
                            await _hub.Clients.All.SendAsync("PrijsUpdate", activeAuction.CurrentPrice, cancellationToken: stoppingToken);
                        }
                        else
                        {
                            // Bodem bereikt -> Timeout
                            await _auctionService.TimeoutAuction(activeAuction.ProductId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ticker Error: {ex.Message}");
                }

                // Wacht 1 seconde voor de volgende tik
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
}