using backend.DTOs;
using Microsoft.AspNetCore.Hosting;
using System.IO;
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
        private readonly IWebHostEnvironment _environment;

        public ProductController(AppDbContext context, IProductService productService, IWebHostEnvironment environment)
        {
            _context = context;
            _productService = productService;
            _environment = environment;
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
        public async Task<IActionResult> CreateProduct([FromForm] ProductCreateDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
                return Unauthorized("Kan de gebruikers-ID niet vinden.");

            // --- FILE UPLOAD LOGICA ---
            string? dbPath = null;

            if (input.ImageFile != null)
            {
                // FIX: Fallback if WebRootPath is null (happens in tests or if wwwroot missing)
                string webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
                string uploadsFolder = Path.Combine(webRoot, "uploads");

                // Map maken indien nodig
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                // Unieke naam genereren
                string uniqueFileName = Guid.NewGuid().ToString() + "_" + input.ImageFile.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                // Opslaan
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await input.ImageFile.CopyToAsync(fileStream);
                }

                // Pad opslaan voor in de database
                dbPath = $"/uploads/{uniqueFileName}";
            }

            // --- PRODUCT AANMAKEN ---
            var product = new Product
            {
                Naam = input.Naam,
                Beschrijving = input.Beschrijving,
                MinPrijs = input.MinPrijs,
                Aantal = input.Aantal,      // Nieuw Veld (Merged)
                Locatie = input.Locatie,
                BeginDatum = input.BeginDatum,
                ImageUrl = dbPath,
                VerkoperID = userId,
                IsAuctionable = false
            };

            _context.Producten.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProductById), new { id = product.ProductID }, product);
        }

        [HttpDelete("product/{id}")]
        [Authorize(Roles = "veiler")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var product = await _context.Producten.FindAsync(id);

            if (product == null)
                return NotFound("Product niet gevonden.");

            if (product.VerkoperID != userId)
            {
                return Forbid("U mag alleen uw eigen producten verwijderen.");
            }

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

            // Check date if activating
            if (newPrice > 0)
            {
                var today = DateTime.Today;
                if (!product.BeginDatum.HasValue || product.BeginDatum.Value.Date != today)
                {
                    return BadRequest($"Dit product kan niet geactiveerd worden. De startdatum is {product.BeginDatum?.ToShortDateString() ?? "onbekend"}, maar het is vandaag {today.ToShortDateString()}.");
                }
            }

            // Reset to null if 0
            if (newPrice == 0)
            {
                product.StartPrijs = null;
                product.IsAuctionable = false;
            }
            else
            {
                product.StartPrijs = newPrice;
            }

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
                return Ok(new List<Product>());

            return Ok(ProductenZonderStartprijs);
        }

        [HttpGet("product/veilbarelijst")]
        public async Task<IActionResult> GetAuctionableProducts()
        {
            var veilbareProducten = await _productService.GetAuctionableProductsAsync();

            if (veilbareProducten == null || veilbareProducten.Count == 0)
                return Ok(new List<Product>());

            return Ok(veilbareProducten);
        }

        [HttpGet("my-products")]
        [Authorize(Roles = "veiler")]
        public async Task<IActionResult> GetMyProducts()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

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
                .Where(p => p.VerkoperID == userId)
                .ToListAsync();

            return Ok(myProducts);
        }

        [HttpGet("geschiedenis")]
        [Authorize]
        public async Task<IActionResult> GetAankoopGeschiedenis()
        {
            Console.WriteLine("--- DEBUG: Geschiedenis wordt opgevraagd ---");

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                userId = User.FindFirst("sub")?.Value;
            }

            if (string.IsNullOrEmpty(userId))
            {
                userId = User.FindFirst("id")?.Value;
            }

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("De server kan uw User ID niet uit het token lezen.");
            }

            var gekochteProducten = await _context.Producten
                .Where(p => p.KoperID == userId)
                .OrderByDescending(p => p.EindDatum)
                .AsNoTracking()
                .ToListAsync();

            return Ok(gekochteProducten);
        }
    }
}