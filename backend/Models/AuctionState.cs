namespace backend.Models
{
    public class AuctionState
    {
        public int ProductId { get; set; }
        public bool IsRunning { get; set; }
        public bool IsSold { get; set; }
        public DateTime StartTime { get; set; }
        public string? BuyerName { get; set; }
        public decimal FinalPrice { get; set; }

        // Live price that changes
        public decimal CurrentPrice { get; set; }

        // ADDED: Original start price for timestamp calculation
        public decimal StartPrice { get; set; }

        public decimal MinPrice { get; set; }
    }
}