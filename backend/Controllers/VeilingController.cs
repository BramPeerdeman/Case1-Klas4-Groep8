using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;


namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VeilingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<AuctionHub> _hub;

        public VeilingController(AppDbContext context, IHubContext<AuctionHub> hub)
        {
            _context = context;
            _hub = hub;
        }

        [HttpGet("veiling/currentprice")]
        public async Task<IActionResult> PriceMovement(decimal prijs, decimal minprijs )
        {
            if (prijs > minprijs)
            {
                decimal nieuwePrijs = prijs - 2;
                await _hub.Clients.All.SendAsync("PrijsUpdate", nieuwePrijs);
                return Ok(new { nieuwePrijs });
            }
            return Ok();
        }

        [HttpPost("veiling")]
        public async Task<IActionResult> StartVeiling([FromBody] Product GeveildProduct)
        {
            Veiling veiling = new Veiling();
            //VeilingID methode moet nader bepaald worden of in cont of in sqldb
            veiling.StartDatumTijd = DateTime.Now;
            
            // --- HIER ZIT DE FIX ---
            // We voegen '?? 0' toe. Dit betekent: "Als het null is, maak er dan 0 van."
            veiling.VerkoperID = GeveildProduct.VerkoperID ?? 0;
            // -----------------------

            veiling.ProductID = GeveildProduct.ProductID;

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.Veilingen.Add(veiling);
            await _context.SaveChangesAsync();
            return Ok(veiling);
        }

        [HttpPost("koop")]
        public async Task <IActionResult> Koop()
        {
            return Ok();
        }





    }
}
