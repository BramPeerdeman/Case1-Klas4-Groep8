using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
            // Combine all concrete users into one list
            var admins = await _context.Admins.ToListAsync();
            var veilers = await _context.Veilers.ToListAsync();
            var kopers = await _context.Kopers.ToListAsync();

            var alleGebruikers = admins
                .Cast<Gebruiker>()
                .Concat(veilers)
                .Concat(kopers)
                .ToList();

            return Ok(alleGebruikers);
        }
        // POST Admin
        [HttpPost("admin")]
        public async Task<IActionResult> AddAdmin([FromBody] Admin admin)
        {
            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = admin.GebruikersID }, admin);
        }

        // POST Veiler
        [HttpPost("veiler")]
        public async Task<IActionResult> AddVeiler([FromBody] Veiler veiler)
        {
            _context.Veilers.Add(veiler);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = veiler.GebruikersID }, veiler);
        }

        // POST Koper
        [HttpPost("koper")]
        public async Task<IActionResult> AddKoper([FromBody] Koper koper)
        {
            _context.Kopers.Add(koper);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = koper.GebruikersID }, koper);
        }
    }
}
