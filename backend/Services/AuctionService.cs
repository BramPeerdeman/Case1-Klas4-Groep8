using backend.Data;
using Microsoft.EntityFrameworkCore;


namespace backend.Services
{
    public class AuctionService
    {
        private readonly AppDbContext _db;

        public AuctionService(AppDbContext db)
        {
            _db = db;
        }

        public async Task MoveNewAuctionableProducts(CancellationToken ct = default)
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
    }

}