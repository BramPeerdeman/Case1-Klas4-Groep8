using backend.Data;
using backend.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System.Threading;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.Tasks;

namespace backend.Services
{
    
        public class PriceTickerService : BackgroundService
        {
            private readonly IHubContext<AuctionHub> _hub;
            private readonly IServiceScopeFactory _scopeFactory;

            public PriceTickerService(
                IHubContext<AuctionHub> hub,
                IServiceScopeFactory scopeFactory)
            {
                _hub = hub;
                _scopeFactory = scopeFactory;
            }

            protected override async Task ExecuteAsync(CancellationToken stoppingToken)
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    // Example: hard-coded product id 1 for now
                    var product = await db.Producten
                        .FirstOrDefaultAsync(p => p.ProductID == 1, stoppingToken);

                    if (product == null)
                    {
                        await Task.Delay(1000, stoppingToken);
                        continue;
                    }

                // Assuming:
                // StartPrijs: decimal?
                // MinimumPrijs: float? (or decimal? – adjust accordingly)

                decimal current = product.StartPrijs ?? 0m;

                // If MinimumPrijs is decimal?
                // decimal min = product.MinimumPrijs ?? 0m;

                // If MinimumPrijs is float? and you need decimal:
                decimal min = product.MinPrijs ?? 0m;

                if (current > min)
                    {
                        decimal next = current - 1m;

                        product.StartPrijs = next;
                        await db.SaveChangesAsync(stoppingToken);

                        await _hub.Clients.All.SendAsync(
                            "PrijsUpdate",
                            next,
                            cancellationToken: stoppingToken
                        );
                    }

                    await Task.Delay(1000, stoppingToken);
                }
            }
        }
  
}
