using Microsoft.AspNetCore.Http;

namespace backend.DTOs
{
    public class ProductCreateDto
    {
        public string Naam { get; set; } = string.Empty;
        public string Beschrijving { get; set; } = string.Empty;
        public decimal MinPrijs { get; set; }
        public int Aantal { get; set; }
        public string? Locatie { get; set; }
        public DateTime BeginDatum { get; set; }

        // Dit vangt het bestand op dat de frontend stuurt
        public IFormFile? ImageFile { get; set; }
    }
}