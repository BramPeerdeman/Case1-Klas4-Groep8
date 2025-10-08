namespace backend.Models;
public class Veiler : Gebruiker
{
    public string KvkNummer { get; set; } = string.Empty;
    public ICollection<Product> Producten { get; set; } = new List<Product>();
}
