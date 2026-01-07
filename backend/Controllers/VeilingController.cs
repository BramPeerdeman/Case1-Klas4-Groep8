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

        [HttpPost("start/{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> StartVeiling(int id)
        {
            await _auctionService.StartAuctionAsync(id);
            return Ok(new { message = $"Veiling {id} gestart." });
        }

        [HttpGet("active")]
        public IActionResult GetActive()
        {
            var active = _auctionService.GetActiveAuction();
            if (active == null) return NotFound("Geen actieve veiling");
            return Ok(active);
        }

        [HttpPost("queue/add")]
        [Authorize(Roles = "admin")]
        public IActionResult AddToQueue([FromBody] List<int> productIds)
        {
            _auctionService.AddToQueue(productIds);
            return Ok(new { message = "Toegevoegd aan wachtrij" });
        }

        // --- NEW: Endpoint to remove from queue ---
        [HttpPost("queue/remove/{id}")]
        [Authorize(Roles = "admin")]
        public IActionResult RemoveFromQueue(int id)
        {
            _auctionService.RemoveFromQueue(id);
            return Ok(new { message = "Verwijderd uit wachtrij." });
        }

        [HttpPost("queue/start")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> StartQueue()
        {
            await _auctionService.StartQueueAsync();
            return Ok(new { message = "Queue gestart!" });
        }

        [HttpPost("force-next")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> ForceNext()
        {
            await _auctionService.ForceNextAsync();
            return Ok(new { message = "Volgende item geforceerd." });
        }

        [HttpPost("koop")]
        public async Task<IActionResult> Koop([FromBody] KoopRequest request)
        {
            bool gelukt = await _auctionService.PlaatsBod(request.ProductId, request.BuyerName, request.Price);
            if (gelukt) return Ok(new { message = "Gekocht!" });
            return BadRequest(new { message = "Te laat!" });
        }

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
    }
}