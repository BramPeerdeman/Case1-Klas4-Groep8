public class Koper : Gebruiker
{
    public ICollection<Veiling> GewonnenVeilingen { get; set; } = new List<Veiling>();
}
