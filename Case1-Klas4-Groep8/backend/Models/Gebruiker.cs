namespace backend.Models;
public abstract class Gebruiker
{
    public int GebruikersID { get; set; }
    public string Gebruikersnaam { get; set; } = string.Empty;
    public string Wachtwoord { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Voornaam { get; set; } = string.Empty;
    public string Achternaam { get; set; } = string.Empty;
    public string UiSettings { get; set; } = string.Empty;
}
