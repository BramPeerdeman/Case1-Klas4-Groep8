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
            // Even wachten bij opstarten
            await Task.Delay(2000, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var activeAuction = _auctionService.GetActiveAuction();

                    if (activeAuction != null && activeAuction.IsRunning && !activeAuction.IsSold)
                    {
                        // 1. Hoe lang zijn we bezig?
                        var elapsed = DateTime.Now - activeAuction.StartTime;

                        // 2. DEFINITIEVE REGEL: De veiling duurt ALTIJD 30 seconden
                        var totalDuration = TimeSpan.FromSeconds(30);

                        // 3. Bereken percentage (0.0 tot 1.0)
                        double progress = elapsed.TotalMilliseconds / totalDuration.TotalMilliseconds;

                        // Begrens tussen 0% en 100%
                        if (progress > 1.0) progress = 1.0;
                        if (progress < 0.0) progress = 0.0;

                        // 4. Formule: Start - (Verschil * Percentage)
                        decimal start = activeAuction.StartPrice;
                        decimal min = activeAuction.MinPrice;
                        decimal priceDrop = (start - min) * (decimal)progress;

                        decimal newPrice = start - priceDrop;

                        // 5. Update state
                        activeAuction.CurrentPrice = newPrice;

                        // 6. Stuur update (Elke 100ms!)
                        await _hub.Clients.All.SendAsync("PrijsUpdate", activeAuction.CurrentPrice, cancellationToken: stoppingToken);

                        // Timeout check
                        if (progress >= 1.0 || activeAuction.CurrentPrice <= activeAuction.MinPrice)
                        {
                            await _auctionService.TimeoutAuction(activeAuction.ProductId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ticker Error: {ex.Message}");
                }

                // CRUCIAAL: 100ms delay zorgt voor vloeiende updates op het scherm
                await Task.Delay(100, stoppingToken);
            }
        }
    }
}