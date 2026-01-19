using backend.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace backend.interfaces
{
    public interface IProductService
    {
        Task<List<Product>> GetAuctionableProductsAsync();
        Task<List<Product>> GetScheduledProductsAsync();

        // ADDED: Method to clean up old unsold products
        Task ResetExpiredProductsAsync();
    }
}