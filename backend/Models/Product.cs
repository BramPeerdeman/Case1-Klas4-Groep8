namespace backend.Models;
public class Product
{
    public int ProductID { get; set; }
    public string Naam { get; set; } = string.Empty;
    public string Beschrijving { get; set; } = string.Empty;
    public float StartPrijs { get; set; }

    // Relatie naar Veiler
    public int VerkoperID { get; set; }
    public Veiler Verkoper { get; set; } = null!;

    public ICollection<Veiling> Veilingen { get; set; } = new List<Veiling>();
}
