using backend.Data;
using backend.interfaces;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services  
{
    public class ProductService:IProductService
    {
        private readonly AppDbContext _context;
        public ProductService(AppDbContext context)
        {
            _context = context;
        }

        public async Task <List<Product>> GetAuctionableProductsAsync()
        {
            return await _context.Producten
                .AsNoTracking()
                .Where(p => p.StartPrijs != null)
                .ToListAsync();
        }
    }
}
