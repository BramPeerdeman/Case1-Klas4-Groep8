using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GebruikerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GebruikerController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Gebruiker
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var gebruikers = await _context.Gebruikers.ToListAsync();
            return Ok(gebruikers);
        }

        // GET: api/Gebruiker/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var gebruiker = await _context.Gebruikers.FindAsync(id);
            if (gebruiker == null)
                return NotFound();

            return Ok(gebruiker);
        }

        // POST: api/Gebruiker
        // Polymorf: accepteert Admin, Veiler of Koper
        [HttpPost]
        public async Task<IActionResult> Add([FromBody] Gebruiker gebruiker)
        {
            _context.Gebruikers.Add(gebruiker);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = gebruiker.GebruikersID }, gebruiker);
        }

        // PUT: api/Gebruiker/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Gebruiker updatedGebruiker)
        {
            var existing = await _context.Gebruikers.FindAsync(id);
            if (existing == null)
                return NotFound();

            // Map de velden van updatedGebruiker naar existing behalve id self
            // basisvelden
            existing.Gebruikersnaam = updatedGebruiker.Gebruikersnaam;
            existing.Wachtwoord = updatedGebruiker.Wachtwoord;
            existing.Email = updatedGebruiker.Email;
            existing.Voornaam = updatedGebruiker.Voornaam;
            existing.Achternaam = updatedGebruiker.Achternaam;
            existing.UiSettings = updatedGebruiker.UiSettings;

            // subtype-specifieke velden
            if (existing is Veiler veiler && updatedGebruiker is Veiler updatedVeiler)
            {
                veiler.KvkNummer = updatedVeiler.KvkNummer;
            }
            else if (existing is Koper koper && updatedGebruiker is Koper updatedKoper)
            {
                koper.GewonnenVeilingen = updatedKoper.GewonnenVeilingen;
            }


            await _context.SaveChangesAsync();
            return NoContent();
        }


        // DELETE: api/Gebruiker/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var gebruiker = await _context.Gebruikers.FindAsync(id);
            if (gebruiker == null)
                return NotFound();

            _context.Gebruikers.Remove(gebruiker);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}

//voorbeeld die in swagger ui komt te staan
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
}

