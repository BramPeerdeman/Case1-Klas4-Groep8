namespace backend.DTOs
{
    // Dit is wat de frontend MOET sturen om te registreren
    public class RegisterDto
    {
        public string Email { get; set; } = string.Empty;
        public string Wachtwoord { get; set; } = string.Empty;
        public string Gebruikersnaam { get; set; } = string.Empty;
        public string Voornaam { get; set; } = string.Empty;
        public string Achternaam { get; set; } = string.Empty;
        
        public string? KvkNummer { get; set; } // Alleen voor Veiler
        public string Type { get; set; } = string.Empty; // "koper", "veiler", of "admin"
    }

    // Dit is wat de frontend MOET sturen om in te loggen
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Wachtwoord { get; set; } = string.Empty;
    }

    // Dit is wat de backend TERUGGEEFT na een succesvolle login
    public class UserDto
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string Gebruikersnaam { get; set; } = string.Empty;
    }
}