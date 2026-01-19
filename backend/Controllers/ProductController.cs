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
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IProductService _productService;
        private readonly IAuctionService _auctionService;
        private readonly IWebHostEnvironment _environment;

        public ProductController(AppDbContext context, IProductService productService, IAuctionService auctionService, IWebHostEnvironment environment)
        {
            _context = context;
            _productService = productService;
            _auctionService = auctionService;
            _environment = environment;
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetAllProducts()
        {
            var products = await _context.Producten
                .AsNoTracking()
                .Where(p => p.KoperID == null && p.Aantal > 0)
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

            string? dbPath = null;

            if (input.ImageFile != null)
            {
                string webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
                string uploadsFolder = Path.Combine(webRoot, "uploads");

                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                string uniqueFileName = Guid.NewGuid().ToString() + "_" + input.ImageFile.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await input.ImageFile.CopyToAsync(fileStream);
                }

                dbPath = $"/uploads/{uniqueFileName}";
            }

            var product = new Product
            {
                Naam = input.Naam,
                Beschrijving = input.Beschrijving,
                MinPrijs = input.MinPrijs,
                Aantal = input.Aantal,
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

            if (product.IsAuctionable)
            {
                return BadRequest("Dit product staat ingepland voor de veiling of is live en kan niet worden verwijderd. Stop de verkoop eerst.");
            }

            if (!string.IsNullOrEmpty(product.KoperID))
            {
                return BadRequest("Dit product is al verkocht en kan niet worden verwijderd (nodig voor aankoopgeschiedenis).");
            }

            if (product.VerkoperID != userId)
            {
                return Forbid("U mag alleen uw eigen producten verwijderen.");
            }

            _context.Producten.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Product verwijderd" });
        }

        [HttpPut("product/{id}/stop")]
        [Authorize(Roles = "veiler")]
        public async Task<IActionResult> StopSelling(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            var product = await _context.Producten.FindAsync(id);

            if (product == null) return NotFound();

            if (product.VerkoperID != userId) return Forbid("Niet uw product");

            _auctionService.RemoveFromQueue(id);

            product.IsAuctionable = false;
            product.StartPrijs = null;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Verkoop gestopt. Product is teruggezet naar concepten en uit de wachtrij gehaald." });
        }

        [HttpPut("product/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product updatedproduct)
        {
            var selectedproduct = await _context.Producten.FindAsync(id);
            if (selectedproduct == null)
                return NotFound();

            if (selectedproduct.IsAuctionable || !string.IsNullOrEmpty(selectedproduct.KoperID))
            {
                return BadRequest("Product kan niet worden gewijzigd omdat het live staat of al verkocht is. Stop de verkoop eerst.");
            }

            selectedproduct.Naam = updatedproduct.Naam;
            selectedproduct.Beschrijving = updatedproduct.Beschrijving;
            selectedproduct.MinPrijs = updatedproduct.MinPrijs;
            selectedproduct.Aantal = updatedproduct.Aantal;

            if (updatedproduct.BeginDatum != null)
            {
                selectedproduct.BeginDatum = updatedproduct.BeginDatum;
            }

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

            // --- ADDED VALIDATION: Start Price > Min Price ---
            // Allow 0 for deactivation logic
            if (newPrice > 0 && product.MinPrijs.HasValue && newPrice <= product.MinPrijs.Value)
            {
                return BadRequest($"Startprijs moet hoger zijn dan de minimumprijs (€{product.MinPrijs})");
            }
            // -------------------------------------------------

            // MODIFICATION: Date validation check for 'today' is NOT present here, 
            // allowing the Auction Master to price items for future dates.

            if (newPrice == 0)
            {
                product.StartPrijs = null;
                product.IsAuctionable = false;
            }
            else
            {
                product.StartPrijs = newPrice;
                product.IsAuctionable = true;
            }

            await _context.SaveChangesAsync();
            return Ok(product);
        }

        [HttpGet("product/onveilbarelist")]
        public async Task<IActionResult> GetUnassignedProducts()
        {
            var today = DateTime.Today; // Use strictly today (matches logic in Service)

            var ProductenZonderStartprijs = await _context.Producten
                .Where(p => p.StartPrijs == null &&
                           (!p.BeginDatum.HasValue || p.BeginDatum.Value.Date >= today)) // ADDED FILTER
                .AsNoTracking()
                .ToListAsync();

            if (ProductenZonderStartprijs == null || ProductenZonderStartprijs.Count == 0)
                return Ok(new List<Product>());

            return Ok(ProductenZonderStartprijs);
        }

        // --- NEW ENDPOINT: SCHEDULED PRODUCTS ---
        [HttpGet("product/scheduled")]
        public async Task<IActionResult> GetScheduledProducts()
        {
            // Returns products that are priced but scheduled for the future
            var scheduledProducts = await _productService.GetScheduledProductsAsync();

            if (scheduledProducts == null || scheduledProducts.Count == 0)
                return Ok(new List<Product>());

            return Ok(scheduledProducts);
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
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            }

            if (string.IsNullOrEmpty(userId))
            {
                userId = User.FindFirst("id")?.Value;
            }

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("De server kan uw User ID niet uit het token lezen.");
            }

            var history = await _context.Veilingen
                .AsNoTracking()
                .Where(v => v.KoperId == userId)
                .Join(_context.Producten,
                    veiling => veiling.ProductID,
                    product => product.ProductID,
                    (veiling, product) => new PurchaseHistoryDto
                    {
                        ProductID = product.ProductID,
                        Naam = product.Naam,
                        ImageUrl = product.ImageUrl,
                        Beschrijving = product.Beschrijving,
                        VerkoopPrijs = veiling.VerkoopPrijs,
                        Aantal = veiling.Aantal,
                        Datum = veiling.StartDatumTijd
                    })
                .OrderByDescending(dto => dto.Datum)
                .ToListAsync();

            return Ok(history);
        }
    }
}