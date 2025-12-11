using backend.Models;

namespace backend.interfaces
{
    
    public interface IAuctionService
    {
        Task MoveNewAuctionableProductsAsync(CancellationToken ct = default);
        
        void AddToQueue(List<int> productIds);
        Task StartQueueAsync();

        Task StartAuctionAsync(int productId);
        AuctionState GetStatus(int productId);
        Task<bool> PlaatsBod(int productId, string koperNaam, decimal bedrag);


        Task CreateQueueAsync();
        Task StartnextAuctionAsync();


    }
    
}
