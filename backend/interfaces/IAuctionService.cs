using backend.Models;

namespace backend.interfaces
{
    public interface IAuctionService
    {
        Task MoveNewAuctionableProductsAsync(CancellationToken ct = default);

        void AddToQueue(List<int> productIds);
        Task StartQueueAsync();

        AuctionState? GetActiveAuction();

        Task StartAuctionAsync(int productId);
        AuctionState GetStatus(int productId);
        Task<bool> PlaatsBod(int productId, string koperNaam, decimal bedrag);

        Task CreateQueueAsync();
        Task StartnextAuctionAsync();

        Task ForceNextAsync();

        // --- NEW: Method to remove item from queue ---
        void RemoveFromQueue(int productId);
    }
}