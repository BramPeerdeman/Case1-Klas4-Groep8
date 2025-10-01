namespace backend.Models;
public class Veiling
{
    public int VeilingID { get; set; }
    public float VerkoopPrijs { get; set; }
    public DateTime Datum { get; set; }
    public TimeSpan StartTijd { get; set; }
    public int VeilingDuur { get; set; } // in minuten
    public TimeSpan EindTijd { get; set; }

    public int ProductID { get; set; }
    public Product Product { get; set; } = null!;

    public int? KoperID { get; set; } // null totdat iemand wint
    public Koper? Koper { get; set; }
}
