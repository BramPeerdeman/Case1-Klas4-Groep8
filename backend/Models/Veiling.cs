namespace backend.Models;
public class Veiling
{
    public int VeilingID { get; set; }
    public float? VerkoopPrijs { get; set; }
    public DateTime StartDatumTijd { get; set; }

    public TimeSpan? EindTijd { get; set; }

    public int ProductID { get; set; }

    public int VerkoperID { get; set; }

    public string? KoperId { get; set; }
    public Koper? Koper { get; set; } 

}
 