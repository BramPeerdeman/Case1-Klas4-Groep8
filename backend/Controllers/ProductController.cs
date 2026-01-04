//deze controller dient voor het uploaden en ophalen van een product uit de database
using backend.Data;
using backend.interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IProductService _productService;

        public ProductController(AppDbContext context, IProductService productService)
        {
            _context = context;
            _productService = productService;
        }

        [HttpGet("products")]

        public async Task<IActionResult> GetAllProducts()
        {
            var products = await _context.Producten
                .AsNoTracking()
                .ToListAsync();
            return Ok(products);
        }

        [HttpGet("product/{id}")]
        public async Task<IActionResult> GetProductById(int id)
        {
            var product = await _context.Producten
                 .AsNoTracking()
                 .FirstOrDefaultAsync(p => p.ProductID == id);
            if (product == null)
                return NotFound("productID not found!");

            return Ok(product);
        }
        [Authorize(Roles = "veiler")]
        [HttpPost("product")]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 1. Probeer de ID op meerdere manieren te vinden
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            // 2. CHECK: Als we geen ID hebben, stop direct!
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kan de gebruikers-ID niet uit het token halen. Log opnieuw in.");
            }

            // 3. Koppel de verkoper
            product.VerkoperID = userId;

            _context.Producten.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProductById), new { id = product.ProductID }, product);
        }

        [HttpDelete("product/{id}")]
        [Authorize(Roles = "veiler")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            // 1. Get the current User ID (Same logic as in Create/GetMyProducts)
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            // 2. Find the product
            var product = await _context.Producten.FindAsync(id);

            if (product == null)
                return NotFound("Product niet gevonden.");

            // 3. SECURITY CHECK: Ensure the logged-in user is the owner
            if (product.VerkoperID != userId)
            {
                return Forbid("U mag alleen uw eigen producten verwijderen.");
            }

            // 4. Delete
            _context.Producten.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product verwijderd" });
        }

        [HttpPut("product/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product updatedproduct)
        {
            var selectedproduct = await _context.Producten.FindAsync(id);
            if (selectedproduct == null)
                return NotFound();

            selectedproduct.StartPrijs = updatedproduct.StartPrijs;
            await _context.SaveChangesAsync();

            return Ok(selectedproduct);

        }
        [Authorize(Roles = "admin, veiler")]
        [HttpPut("product/{id}/veranderprijs")]
        public async Task<IActionResult> UpdateProductPrice(int id, [FromBody] decimal newPrice)

        {
            if (newPrice < 0)
            {
        return BadRequest("De prijs mag niet negatief zijn.");
            }
            var product = await _context.Producten.FindAsync(id);
            if (product == null)
                return NotFound();
            product.StartPrijs = newPrice;
            await _context.SaveChangesAsync();
            return Ok(product);
        }

        [HttpGet("product/onveilbarelist")]
        public async Task<IActionResult> GetUnassignedProducts()
        {
            var ProductenZonderStartprijs = await _context.Producten
                .Where(p => p.StartPrijs == null)
                .AsNoTracking()
                .ToListAsync();

            if (ProductenZonderStartprijs == null || ProductenZonderStartprijs.Count == 0)
                return NotFound("geen producten zonder startprijs gevonden");

            return Ok(ProductenZonderStartprijs);
        }

        [HttpGet("product/veilbarelijst")]
        public async Task<IActionResult> GetAuctionableProducts()
        {
            var veilbareProducten = await _productService.GetAuctionableProductsAsync();

            if (veilbareProducten == null || veilbareProducten.Count == 0)
                return NotFound("geen veilbare producten gevonden");

            return Ok(veilbareProducten);
        }

        [HttpGet("my-products")]
        [Authorize(Roles = "veiler")] // Only veilers can access this
        public async Task<IActionResult> GetMyProducts()
        {
            // Retrieve the User ID from the 'sub' claim in the token
            // Probeer eerst de standaard NameIdentifier
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Als die leeg is, probeer dan de specifieke Jwt claim
            if (string.IsNullOrEmpty(userId))
            {
                userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            }

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User ID not found in token.");
            }

            var myProducts = await _context.Producten
                .AsNoTracking()
                .Where(p => p.VerkoperID == userId) // FILTER: Only show products matching this ID
                .ToListAsync();

            return Ok(myProducts);
        }
    }
}
