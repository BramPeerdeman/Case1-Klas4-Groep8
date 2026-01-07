namespace backend.Models;
public class Veiling
{
    public int VeilingID { get; set; }
    public float? VerkoopPrijs { get; set; }
    public int Aantal { get; set; } // New field for quantity bought
    public DateTime StartDatumTijd { get; set; }

    public TimeSpan? EindTijd { get; set; }

    public int ProductID { get; set; }

    public string? VerkoperID { get; set; }

    public string? KoperId { get; set; }
    public Koper? Koper { get; set; }
}