using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VeilingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VeilingController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("veiling")]
        public async Task<IActionResult> CreateVeiling([FromBody] Veiling veiling)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.Veilingen.Add(veiling);
            await _context.SaveChangesAsync();
            return Ok(veiling);
        }


    }
}
