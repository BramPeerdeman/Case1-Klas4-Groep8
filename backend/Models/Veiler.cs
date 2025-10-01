namespace backend.Models;
public class Veiler : Gebruiker
{
    public ICollection<Product> Producten { get; set; } = new List<Product>();
}
