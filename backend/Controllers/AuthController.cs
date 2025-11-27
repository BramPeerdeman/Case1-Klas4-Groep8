using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

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
        var userByEmail = await _userManager.FindByEmailAsync(registerDto.Email);
    if (userByEmail != null)
    {
    // Stuur een specifieke fout terug
        return BadRequest("Een gebruiker met deze e-mail bestaat al.");
    }

// 2. NIEUWE CHECK: Controleer of de GEBRUIKERSNAAM al bestaat
    var userByUsername = await _userManager.FindByNameAsync(registerDto.Gebruikersnaam);
    if (userByUsername != null)
    {
    // Stuur een specifieke fout terug
        return BadRequest("Deze gebruikersnaam is al in gebruik.");
    }

        
        Gebruiker gebruiker;
        switch (registerDto.Type.ToLower())
        {
            case "koper":
                gebruiker = new Koper();
                break;
            case "veiler":
    // VALIDATIE: Check of het veld is ingevuld
                if (string.IsNullOrEmpty(registerDto.KvkNummer))
                {
                    return BadRequest("KVK-nummer is verplicht voor veilers.");
                }

                // OPSLAAN: Maak de veiler aan MET het nummer
                gebruiker = new Veiler 
                { 
                    KvkNummer = registerDto.KvkNummer 
                };
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
        var rol = registerDto.Type.ToLower();
        await _userManager.AddToRoleAsync(gebruiker, rol);

        return Ok(new RegisterResponseDto { Message = "Gebruiker succesvol geregistreerd." });
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

        
        var token = await GenerateJwtToken(gebruiker);

        
        return Ok(new UserDto
        {
            Email = gebruiker.Email ?? string.Empty,
            Gebruikersnaam = gebruiker.UserName ?? string.Empty,
            Token = token
        });
    }

    //[HttpGet("settings")]
    //[Authorize]
    //public async Task<IActionResult> GetSettings()
    //{
    //    var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    //    var gebruiker = await _userManager.FindByIdAsync(userId);
    //    if (gebruiker == null) return NotFound();

    //    var settings = string.IsNullOrEmpty(gebruiker.UiSettings)
    //        ? "{}"
    //        : gebruiker.UiSettings;

    //    return Ok(settings);
    //}

    //[HttpPut("settings")]
    //[Authorize]
    //public async Task<IActionResult> UpdateSettings([FromBody] JsonElement settings)
    //{
    //    var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    //    var gebruiker = await _userManager.FindByIdAsync(userId);
    //    if (gebruiker == null) return NotFound();

    //    gebruiker.UiSettings = settings.GetRawText(); // store JSON string
    //    await _userManager.UpdateAsync(gebruiker);

    //    return Ok(new { Message = "Settings updated." });
    //}

    private async Task<string> GenerateJwtToken(Gebruiker gebruiker)
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

    
    var userRoles = await _userManager.GetRolesAsync(gebruiker);


var claims = new List<Claim>
{
    new Claim(JwtRegisteredClaimNames.Sub, gebruiker.Id), 
    new Claim(JwtRegisteredClaimNames.Email, gebruiker.Email ?? string.Empty), 
    new Claim(JwtRegisteredClaimNames.Name, gebruiker.UserName ?? string.Empty), 
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) 
};

// 3c. Voeg alle rollen van de gebruiker toe als "Rol" claims
foreach (var userRole in userRoles)
{
    claims.Add(new Claim(ClaimTypes.Role, userRole));
}

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