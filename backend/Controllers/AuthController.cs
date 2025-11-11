using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers;
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<Gebruiker> _userManager;
        private readonly SignInManager<Gebruiker> _signInManager;
        private readonly IConfiguration _config;

    // Vraag de managers en config aan via de constructor
    public AuthController(
        UserManager<Gebruiker> userManager,
        SignInManager<Gebruiker> signInManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = configuration;
    }


    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        // 1. Controleer of de gebruiker (op basis van e-mail) al bestaat
        var userExists = await _userManager.FindByEmailAsync(registerDto.Email);
        if (userExists != null)
        {
            return BadRequest("Een gebruiker met deze e-mail bestaat al.");
        }

        
        Gebruiker gebruiker;
        switch (registerDto.Type.ToLower())
        {
            case "koper":
                gebruiker = new Koper();
                break;
            case "veiler":
                gebruiker = new Veiler();
                break;
            case "admin":
                gebruiker = new Admin();
                break;
            default:
                return BadRequest("Ongeldig gebruikerstype.");
        }

        
        gebruiker.Email = registerDto.Email;
        gebruiker.UserName = registerDto.Gebruikersnaam; 
        gebruiker.Voornaam = registerDto.Voornaam;
        gebruiker.Achternaam = registerDto.Achternaam;

        
        var result = await _userManager.CreateAsync(gebruiker, registerDto.Wachtwoord);

        if (!result.Succeeded)
        {
            
            return BadRequest(result.Errors);
        }

        return Ok(new { Message = "Gebruiker succesvol geregistreerd." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        
        var gebruiker = await _userManager.FindByEmailAsync(loginDto.Email);
        if (gebruiker == null)
        {
            
            return Unauthorized("Ongeldige e-mail of wachtwoord.");
        }

        // 2. Controleer het wachtwoord (veilig)
        var result = await _signInManager.CheckPasswordSignInAsync(
          gebruiker, loginDto.Wachtwoord, false); // 'false' = niet buitensluiten bij falen

        if (!result.Succeeded)
        {
            return Unauthorized("Ongeldige e-mail of wachtwoord.");
        }

        
        var token = GenerateJwtToken(gebruiker);

        
        return Ok(new UserDto
        {
            Email = gebruiker.Email ?? string.Empty,
            Gebruikersnaam = gebruiker.UserName ?? string.Empty,
            Token = token
        });
    }
    
    private string GenerateJwtToken(Gebruiker gebruiker)
{
    
    var jwtKey = _config["Jwt:Key"];
    var jwtIssuer = _config["Jwt:Issuer"];
    var jwtAudience = _config["Jwt:Audience"];

    if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
    {
        throw new Exception("JWT instellingen (Key, Issuer, Audience) zijn niet geconfigureerd in appsettings.json");
    }

    
    var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

    
    var claims = new[]
    {
        // Unieke ID van de gebruiker
        new Claim(JwtRegisteredClaimNames.Sub, gebruiker.Id), 
        // E-mailadres
        new Claim(JwtRegisteredClaimNames.Email, gebruiker.Email ?? string.Empty), 
        // Gebruikersnaam
        new Claim(JwtRegisteredClaimNames.Name, gebruiker.UserName ?? string.Empty), 
        // Een unieke ID voor deze specifieke token
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) 
        // TODO: Je kunt hier ook de ROL (Koper/Veiler) toevoegen
    };

    // 4. Maak het token-object aan
    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        audience: jwtAudience,
        claims: claims,
        expires: DateTime.Now.AddHours(1), // Geldig voor 1 uur
        signingCredentials: credentials);

    // 5. Schrijf het token naar een string
    return new JwtSecurityTokenHandler().WriteToken(token);
}
    
}