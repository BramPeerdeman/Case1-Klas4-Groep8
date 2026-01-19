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

        public async Task<List<Product>> GetScheduledProductsAsync()
        {
            var today = DateTime.Today;

            return await _context.Producten
                .AsNoTracking()
                .Where(p => p.StartPrijs != null &&
                            p.IsAuctionable == true &&
                            p.BeginDatum.HasValue &&
                            p.BeginDatum.Value.Date > today)
                .ToListAsync();
        }

        // --- ADDED IMPLEMENTATION ---
        public async Task ResetExpiredProductsAsync()
        {
            var today = DateTime.Today;

            // Find products that:
            // 1. Are marked as auctionable
            // 2. Have not been sold (KoperID is null)
            // 3. Are scheduled for a date strictly before today
            var expiredProducts = await _context.Producten
                .Where(p => p.IsAuctionable == true &&
                            p.KoperID == null &&
                            p.BeginDatum.HasValue &&
                            p.BeginDatum.Value.Date < today)
                .ToListAsync();

            if (expiredProducts.Any())
            {
                foreach (var product in expiredProducts)
                {
                    // Reset status so Seller can edit/reschedule
                    product.IsAuctionable = false;

                    // Reset price so it appears in Auction Master's "Onveilbare lijst"
                    product.StartPrijs = null;
                }

                await _context.SaveChangesAsync();
            }
        }
    }
}