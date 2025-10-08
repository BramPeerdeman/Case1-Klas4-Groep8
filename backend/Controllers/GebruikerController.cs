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
        /*
         * Ik heb hieronder de GetById, Update en Delete methoden toegevoegd voor CRUD-functionaliteit.
         * Ik heb voor de ?? operator gekozen om eerst in de Admins tabel te zoeken, daarna in de Veilers tabel en als laatste in de Kopers tabel.
         * Dit zorgt ervoor dat we het juiste type gebruiker terugkrijgen.
         * Maar ik heb de koper als gebruiker gecast omdat ik anders een foutmelding kreeg van 'Operator ?? cannot be applied to operand types Veiler and Verkoper'
         * Dit komt omdat de compiler niet weet hoe hij ze moet unificeren omdat ze twee verschillende concrete types zijn.
        */

        // GET: api/Gebruiker/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var gebruiker = await _context.Admins.FindAsync(id)
                           ?? await _context.Veilers.FindAsync(id) as Veiler
                           ?? await _context.Kopers.FindAsync(id) as Gebruiker;

            if (gebruiker == null)
                return NotFound();

            return Ok(gebruiker);
        }

        // PUT: api/Gebruiker/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Gebruiker updatedGebruiker)
        {
            if (id != updatedGebruiker.GebruikersID)
                return BadRequest("ID mismatch");

            // Attach and mark entity as modified
            _context.Entry(updatedGebruiker).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await GebruikerExists(id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Gebruiker/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var gebruiker = await _context.Admins.FindAsync(id)
                           ?? await _context.Veilers.FindAsync(id) as Veiler
                           ?? await _context.Kopers.FindAsync(id) as Gebruiker;

            if (gebruiker == null)
                return NotFound();

            _context.Remove(gebruiker);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<bool> GebruikerExists(int id)
        {
            return await _context.Admins.AnyAsync(a => a.GebruikersID == id)
                || await _context.Veilers.AnyAsync(v => v.GebruikersID == id)
                || await _context.Kopers.AnyAsync(k => k.GebruikersID == id);
        }

    }
}
