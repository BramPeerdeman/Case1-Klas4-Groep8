using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class AuctionHub: Hub
    {
        public async Task BroadCastPrice(decimal prijs)
            => await Clients.All.SendAsync("PrijsUpdate", prijs);

    }
}
