using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
namespace backend.Models;
[JsonDerivedType(typeof(Admin), "admin")]
[JsonDerivedType(typeof(Veiler), "veiler")]
[JsonDerivedType(typeof(Koper), "koper")]
public abstract class Gebruiker : IdentityUser
{
        public string Voornaam { get; set; } = string.Empty;
    public string Achternaam { get; set; } = string.Empty;
    public string UiSettings { get; set; } = string.Empty;
}
