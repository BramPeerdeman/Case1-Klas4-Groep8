using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class AuctionHub: Hub
    {
        public async Task BroadCastPrice(decimal prijs)
            => await Clients.All.SendAsync("PrijsUpdate", prijs);
        
        //Deze functie wordt aangeroepen als de klant verbinding maakt(Frontend)
        public async Task JoinAuctionGroup(string productId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, productId);
        }
    }
}
