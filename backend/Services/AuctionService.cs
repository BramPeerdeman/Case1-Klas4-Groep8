using Microsoft.AspNetCore.SignalR;
using backend.Hubs;
using backend.Models;

namespace backend.Services
{
    public class AuctionService
    {
        private readonly IHubContext<AuctionHub> _hubContext;

        public int? CurrentActiveProductId { get; private set; }
        public DateTime? AuctionStartTime { get; private set; }
        public bool IsRunning { get; private set; }

        public AuctionService(IHubContext<AuctionHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task StartAuction(int productId, decimal startPrijs)
        {
            CurrentActiveProductId = productId;
            AuctionStartTime = DateTime.Now;
            IsRunning = true;

            await _hubContext.Clients.All.SendAsync("UpdateActiveAuction", productId);
            await _hubContext.Clients.All.SendAsync("AuctionStarted", new
            {
                productId = productId,
                startTime = AuctionStartTime,
                startPrice = startPrijs
            });
        }

        public async Task StopAuction()
        {
            IsRunning = false;
            CurrentActiveProductId = null;
            await _hubContext.Clients.All.SendAsync("AuctionEnded");
        }
    }
}
