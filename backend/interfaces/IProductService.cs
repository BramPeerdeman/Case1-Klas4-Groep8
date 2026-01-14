using backend.Models;
using System.Collections.Generic; // Ensure this is present if List<> is used without fully qualified name, though usually implicitly available or in global usings.
using System.Threading.Tasks;

namespace backend.interfaces
{
    public interface IProductService
    {
        Task<List<Product>> GetAuctionableProductsAsync();
        Task<List<Product>> GetScheduledProductsAsync(); // ADDED
    }
}