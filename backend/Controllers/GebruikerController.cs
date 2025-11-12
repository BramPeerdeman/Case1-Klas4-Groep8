

using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GebruikerController : ControllerBase
    {
        private readonly UserManager<Gebruiker> _userManager;

        public GebruikerController(UserManager<Gebruiker> userManager)
        {
            _userManager = userManager;
        }
        private string GenerateJwtToken(Gebruiker gebruiker)
        {
            var jwt = new Helper.JwtService(this.HttpContext.RequestServices.GetService(typeof(IConfiguration)) as IConfiguration);
            return jwt.GenerateJwtToken(gebruiker);
        }

        [HttpPut("{id}/username")]
        public async Task<IActionResult> UpdateUsername(string id, [FromBody] UpdateUsernameDto dto)
        {
            var gebruiker = await _userManager.FindByIdAsync(id);
            if (gebruiker == null) return NotFound("Gebruiker niet gevonden.");

            var passwordValid = await _userManager.CheckPasswordAsync(gebruiker, dto.CurrentPassword);
            if (!passwordValid) return Unauthorized("Wachtwoord ongeldig.");

            gebruiker.UserName = dto.NewUsername;
            var result = await _userManager.UpdateAsync(gebruiker);

            if (!result.Succeeded) return BadRequest(result.Errors);

            // issue a fresh JWT with updated claims
            var token = GenerateJwtToken(gebruiker);
            return Ok(new { Message = "Gebruikersnaam bijgewerkt.", Token = token });
        }

    }

    public class UpdateUsernameDto
    {
        public string NewUsername { get; set; }
        public string CurrentPassword { get; set; }
    }


}

/*//voorbeeld die in swagger ui komt te staan
public class GebruikerExampleFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type == typeof(Admin))
        {
            schema.Example = new OpenApiObject
            {
                ["type"] = new OpenApiString("admin"),
                ["gebruikersnaam"] = new OpenApiString("beheerder01"),
                ["wachtwoord"] = new OpenApiString("VeiligWachtwoord123!"),
                ["email"] = new OpenApiString("admin@example.com"),
                ["voornaam"] = new OpenApiString("Alice"),
                ["achternaam"] = new OpenApiString("Beheer"),
                ["uiSettings"] = new OpenApiString("{}")
            };
        }
    }
}*/