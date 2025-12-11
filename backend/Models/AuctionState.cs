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
    }
}