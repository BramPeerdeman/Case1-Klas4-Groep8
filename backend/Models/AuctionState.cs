namespace backend.Models
{
        public class AuctionState
        {
            public int ProductId { get; set; }
            public bool IsRunning { get; set; }
            public bool IsSold { get; set; }
            public DateTime? StartTime { get; set; } // Wanneer is de veiling gestart
            public string? BuyerName { get; set; }   // Wie er gewonnen heeft
            public decimal FinalPrice { get; set; }
        }
    }
