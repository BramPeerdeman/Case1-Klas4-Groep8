//deze controller dient voor het uploaden en ophalen van een product uit de database
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductController(AppDbContext context)
        {
            _context = context;
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

        [HttpPost("product")]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Producten.Add(product);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetProductById), new { id = product.ProductID }, product);
        }

        [HttpDelete("product/{id}")]
        public async Task<IActionResult> DeleteProductByID(int id)
        {
            var product = await _context.Producten.FindAsync(id);
            if (product == null)
                return NotFound();

            _context.Producten.Remove(product);
            await _context.SaveChangesAsync();
            return NoContent();
            
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

        [HttpGet("product/list")]
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

    }
}
