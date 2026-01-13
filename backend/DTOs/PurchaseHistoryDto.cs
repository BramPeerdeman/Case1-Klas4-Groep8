namespace backend.DTOs
{
    public class PurchaseHistoryDto
    {
        public int ProductID { get; set; }
        public string Naam { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string Beschrijving { get; set; } = string.Empty;
        public float? VerkoopPrijs { get; set; } // Price paid (from Veiling)
        public int Aantal { get; set; }          // Quantity bought (from Veiling)
        public DateTime Datum { get; set; }      // Transaction date
    }
}