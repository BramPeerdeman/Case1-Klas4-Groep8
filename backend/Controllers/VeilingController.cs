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
        public string? BuyerName { get; set; }
        public string? BuyerId { get; set; }
        public decimal Price { get; set; }
        public int Aantal { get; set; } = 1; // Default to 1
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

        // --- NEW ENDPOINT: Get active queue IDs ---
        [HttpGet("queue/ids")]
        public IActionResult GetQueueIds()
        {
            var ids = _auctionService.GetQueueIds();
            return Ok(ids);
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

        // --- Endpoint to remove from queue ---
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
            // Pass the Aantal to the service
            bool gelukt = await _auctionService.PlaatsBod(
                request.ProductId,
                request.BuyerName,
                request.Price,
                request.BuyerId,
                request.Aantal
            );

            if (gelukt) return Ok(new { message = $"Gekocht: {request.Aantal} stuks!" });
            return BadRequest(new { message = "Te laat of onvoldoende voorraad!" });
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