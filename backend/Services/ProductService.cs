using backend.Data;
using backend.interfaces;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Services
{
    public class ProductService : IProductService
    {
        private readonly AppDbContext _context;
        public ProductService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Product>> GetAuctionableProductsAsync()
        {
            var today = DateTime.Today;

            return await _context.Producten
                .AsNoTracking()
                .Where(p => p.StartPrijs != null &&
                            p.BeginDatum.HasValue &&
                            p.BeginDatum.Value.Date <= today &&
                            p.IsAuctionable == true)
                .ToListAsync();
        }

        // --- ADDED METHOD ---
        public async Task<List<Product>> GetScheduledProductsAsync()
        {
            var today = DateTime.Today;

            return await _context.Producten
                .AsNoTracking()
                .Where(p => p.StartPrijs != null &&
                            p.IsAuctionable == true &&
                            p.BeginDatum.HasValue &&
                            p.BeginDatum.Value.Date > today) // Future dates only
                .ToListAsync();
        }
    }
}