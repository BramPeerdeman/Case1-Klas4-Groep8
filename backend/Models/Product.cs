namespace backend.Models;
public class Product
{
    public int ProductID { get; set; }
    public string Naam { get; set; } = string.Empty;
    public string Beschrijving { get; set; } = string.Empty;
    public decimal? StartPrijs { get; set; }
    public decimal? MinPrijs {  get; set; }
    public string? ImageUrl { get; set; }

    public float? Eindprijs { get; set; }

    // Relatie naar Veiler
    public int? VerkoperID { get; set; }


    }
