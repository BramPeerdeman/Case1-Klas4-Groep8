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

        // Updated signature to include 'aantal'
        Task<bool> PlaatsBod(int productId, string koperNaam, decimal bedrag, string koperId, int aantal);

        Task CreateQueueAsync();
        Task StartnextAuctionAsync();

        Task ForceNextAsync();

        Task TimeoutAuction(int productId);

        void RemoveFromQueue(int productId);

        // --- New Method ---
        List<int> GetQueueIds();
    }
}