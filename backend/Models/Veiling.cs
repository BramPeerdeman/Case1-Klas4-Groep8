namespace backend.Models;
public class Veiling
{
    public int VeilingID { get; set; }
    public float? VerkoopPrijs { get; set; }
    public DateTime StartDatumTijd { get; set; }

    public TimeSpan? EindTijd { get; set; }

    public int ProductID { get; set; }

    public int VerkoperID { get; set; }

    public int? KoperID { get; set; } // null totdat iemand wint

}
 