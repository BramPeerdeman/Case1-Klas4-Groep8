using backend.Models;

namespace backend.Services
{
    public class AuctionService
    {
        // We houden hier simpelweg een lijstje bij in het geheugen
        private List<AuctionState> _activeAuctions = new List<AuctionState>();

        public int? CurrentActiveProductId { get; private set; }

        // 1. Start een veiling (Aangeroepen door Admin)
        public void StartAuction(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);

            // Als hij nog niet bestaat, maak hem aan
            if (auction == null)
            {
                auction = new AuctionState { ProductId = productId };
                _activeAuctions.Add(auction);
            }

            // Reset en start
            auction.IsRunning = true;
            auction.IsSold = false;
            auction.StartTime = DateTime.Now;
            auction.BuyerName = null;
            auction.FinalPrice = 0;

            CurrentActiveProductId = productId;
        }

        // 2. Status ophalen (Aangeroepen door Klant/Klok elke seconde)
        public AuctionState GetStatus(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            return auction ?? new AuctionState { ProductId = productId, IsRunning = false };
        }

        // 3. Bod plaatsen (Aangeroepen door Klant op de knop "MIJN!")
        public bool PlaceBid(int productId, string buyerName, decimal price)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);

            if (auction == null || !auction.IsRunning || auction.IsSold)
            {
                return false; // Te laat, of veiling bestaat niet
            }

            // VERKOCHT!
            auction.IsRunning = false;
            auction.IsSold = true;
            auction.BuyerName = buyerName;
            auction.FinalPrice = price;

            // Hier zou je later ook naar de echte database (SQL) kunnen schrijven om het permanent op te slaan
            // _dbContext.Orders.Add(...);

            return true;
        }

        // 4. Resetten (Optioneel voor admin)
        public void Reset(int productId)
        {
            var auction = _activeAuctions.FirstOrDefault(a => a.ProductId == productId);
            if (auction != null) _activeAuctions.Remove(auction);
        }
    }
}
