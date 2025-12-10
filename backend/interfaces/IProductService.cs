using backend.Models;
namespace backend.interfaces
{
    public interface IProductService
    {
        Task<List<Product>> GetAuctionableProductsAsync();
    }
}
