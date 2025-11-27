using backend.Services;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
public class AuctionController : ControllerBase
{
    private readonly AuctionService _auctionService;

    public AuctionController(AuctionService auctionService)
    {
        _auctionService = auctionService;
    }

    // GET: api/Auction/status/5
    // De klok-pagina roept dit elke seconde aan
    [HttpGet("status/{productId}")]
    public IActionResult GetStatus(int productId)
    {
        var status = _auctionService.GetStatus(productId);
        return Ok(status);
    }

    // POST: api/Auction/start/5
    // De Admin pagina roept dit aan
    [HttpPost("start/{productId}")]
    public IActionResult StartAuction(int productId)
    {
        _auctionService.StartAuction(productId);
        return Ok(new { message = "Veiling gestart!" });
    }

    [HttpGet("active")]
    public IActionResult GetActiveAuction()
    {
        // Geeft het ID terug (bijv: 5) of null als er niks bezig is
        return Ok(new { activeId = _auctionService.CurrentActiveProductId });
    }

    // POST: api/Auction/buy
    // De "MIJN!" knop roept dit aan
    [HttpPost("buy")]
    public IActionResult BuyProduct([FromBody] BuyRequest request)
    {
        bool success = _auctionService.PlaceBid(request.ProductId, request.BuyerName, request.Price);

        if (success)
        {
            return Ok(new { message = "Gefeliciteerd! U heeft het product." });
        }
        else
        {
            return BadRequest(new { message = "Helaas, te laat of veiling gesloten." });
        }
    }
}

// Klein hulp-classje voor het JSON bericht van de koper
public class BuyRequest
{
    public int ProductId { get; set; }
    public string BuyerName { get; set; }
    public decimal Price { get; set; }
}