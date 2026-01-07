using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.VisualBasic;

namespace backend.Models;
public class Product
{
    public int ProductID { get; set; }
    public string Naam { get; set; } = string.Empty;
    public DateTime? BeginDatum { get; set; }
    public DateTime? EindDatum { get; set; }
    public string? Locatie { get; set; }
    
    
    public string Beschrijving { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal? StartPrijs { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? MinPrijs {  get; set; }
    public string? ImageUrl { get; set; }
    public int Aantal { get; set; } = 1;
    public bool IsAuctionable { get; set; } = false;

    public float? Eindprijs { get; set; }
    public string? KoperID { get; set; }

    // Relatie naar Veiler
    public string? VerkoperID { get; set; }


    }
