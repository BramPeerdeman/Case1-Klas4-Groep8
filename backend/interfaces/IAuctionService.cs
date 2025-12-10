namespace backend.interfaces
{
    
    public interface IAuctionService
    {
        Task MoveNewAuctionableProductsAsync(CancellationToken ct = default);
        Task CreateQueueAsync();
        Task StartAuctionAsync();
        Task StartnextAuctionAsync();


    }
    
}
