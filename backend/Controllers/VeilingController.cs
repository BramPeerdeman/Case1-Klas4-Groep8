using backend.Data;
using backend.Models;
using backend.Services;
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
        private readonly AuctionService _auctionService;

        public VeilingController(AppDbContext context, AuctionService auctionService)
        {
            _context = context;
            _auctionService = auctionService;
        }

        [HttpGet("active")]
        public IActionResult GetActive()
        {
            return Ok(new
            {
                activeId = _auctionService.CurrentActiveProductId,
                isRunning = _auctionService.IsRunning,
                startTime = _auctionService.AuctionStartTime
            });
        }

        //[HttpGet("veiling/currentprice")]
        //public async Task<IActionResult> PriceMovement(decimal prijs, decimal minprijs )
        //{
        //    if (prijs > minprijs)
        //    {
        //        decimal nieuwePrijs = prijs - 2;
        //        await _hub.Clients.All.SendAsync("PrijsUpdate", nieuwePrijs);
        //        return Ok(new { nieuwePrijs });
        //    }
        //    return Ok();
        //}

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

            decimal startPrijs = (decimal)(GeveildProduct.StartPrijs ?? 0);

            await _auctionService.StartAuction(GeveildProduct.ProductID, startPrijs);
            return Ok(veiling);
        }

        [HttpPost("koop")]
        public async Task <IActionResult> Koop()
        {
            await _auctionService.StopAuction();
            //Later nog extra logica aan toevoegen
            return Ok();
        }





    }
}
