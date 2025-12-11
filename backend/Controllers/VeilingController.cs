using backend.Data;
using backend.Models;
using backend.Services;
using backend.interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Hubs;

namespace backend.Controllers
{
    public class KoopRequest
    {
        public int ProductId { get; set; }
        public string BuyerName { get; set; }
        public decimal Price { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class VeilingController : ControllerBase
    {
        private readonly IAuctionService _auctionService;

        public VeilingController(IAuctionService auctionService)
        {
            _auctionService = auctionService;
        }

        // 1. QUEUE: Toevoegen
        [HttpPost("queue/add")]
        [Authorize(Roles = "admin")]
        public IActionResult AddToQueue([FromBody] List<int> productIds)
        {
            _auctionService.AddToQueue(productIds);
            return Ok(new { message = "Toegevoegd aan wachtrij" });
        }

        // 2. QUEUE: Starten
        [HttpPost("queue/start")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> StartQueue()
        {
            await _auctionService.StartQueueAsync();
            return Ok(new { message = "Queue gestart!" });
        }

        // 3. BOD: Kopen
        [HttpPost("koop")]
        public async Task<IActionResult> Koop([FromBody] KoopRequest request)
        {
            bool gelukt = await _auctionService.PlaatsBod(request.ProductId, request.BuyerName, request.Price);
            if (gelukt) return Ok(new { message = "Gekocht!" });
            return BadRequest(new { message = "Te laat!" });
        }

        // 4. STATUS: Ophalen
        [HttpGet("status/{id}")]
        public IActionResult GetStatus(int id)
        {
            var status = _auctionService.GetStatus(id);
            return Ok(status);
        }

        [Authorize(Roles = "admin")]
        [HttpPost("sync-veilbaar")]
        public async Task<IActionResult> SyncVeilBareProducten()
        {
            await _auctionService.MoveNewAuctionableProductsAsync();
            return Ok();
        }

        // Oude start methode (optioneel, voor enkel product)
        [HttpPost("start/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> StartSingle(int id)
        {
            await _auctionService.StartAuctionAsync(id);
            return Ok();
        }
    }
}