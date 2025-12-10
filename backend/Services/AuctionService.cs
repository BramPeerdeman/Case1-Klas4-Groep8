using backend.Data;
using backend.interfaces;
using backend.Models;
using backend.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;


namespace backend.Services
{
    public class AuctionService: IAuctionService
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<AuctionHub> _hub;
        private readonly IProductService _productService;
        private readonly Queue<Product> _queue = new();
        public AuctionService(AppDbContext db, IProductService productService)
        {
            _db = db;
            _productService = productService;
        }

        public async Task MoveNewAuctionableProductsAsync(CancellationToken ct = default)
        {
            var NewlyAuctionableProducts = await _db.Producten
                .Where(p=>p.StartPrijs != null && !p.IsAuctionable)
                .ToListAsync(ct);

            if (NewlyAuctionableProducts.Count != 0)
                return;

            foreach (var p in NewlyAuctionableProducts)
            {
                p.IsAuctionable = true;
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task 
    }

}