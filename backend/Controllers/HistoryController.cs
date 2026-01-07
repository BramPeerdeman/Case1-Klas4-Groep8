using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace backend.Controllers
{
    // DTOs for the response structure
    public class HistoryResponseDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string SupplierId { get; set; } = string.Empty;
        public SupplierHistoryDto SupplierHistory { get; set; } = new();
        public MarketHistoryDto MarketHistory { get; set; } = new();
    }

    public class SupplierHistoryDto
    {
        public double AveragePrice { get; set; }
        public List<PriceRecordDto> Records { get; set; } = new();
    }

    public class MarketHistoryDto
    {
        public double AveragePrice { get; set; }
        public List<MarketPriceRecordDto> Records { get; set; } = new();
    }

    public class PriceRecordDto
    {
        public DateTime Date { get; set; }
        public double Price { get; set; }
    }

    public class MarketPriceRecordDto : PriceRecordDto
    {
        public string SellerId { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class HistoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HistoryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{productId}")]
        public async Task<IActionResult> GetHistory(int productId)
        {
            var response = new HistoryResponseDto();

            // 1. Get the underlying ADO.NET connection
            var connection = _context.Database.GetDbConnection();

            try
            {
                if (connection.State != ConnectionState.Open)
                    await connection.OpenAsync();

                using var command = connection.CreateCommand();

                // ---------------------------------------------------------
                // Step 1: Get Current Product Details (Name & Supplier)
                // ---------------------------------------------------------
                command.CommandText = @"
                    SELECT Naam, VerkoperID 
                    FROM Producten 
                    WHERE ProductID = @pid";

                var paramId = command.CreateParameter();
                paramId.ParameterName = "@pid";
                paramId.Value = productId;
                command.Parameters.Add(paramId);

                using (var reader = await command.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        response.ProductName = reader.GetString(0);
                        // Handle potential DBNull for VerkoperID
                        response.SupplierId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
                    }
                    else
                    {
                        return NotFound(new { message = "Product not found" });
                    }
                }

                // ---------------------------------------------------------
                // Step 2: Query 1 (Specific Supplier History)
                // ---------------------------------------------------------
                command.Parameters.Clear();

                // Add parameters for Name and Supplier
                var paramName = command.CreateParameter();
                paramName.ParameterName = "@naam";
                paramName.Value = response.ProductName;
                command.Parameters.Add(paramName);

                var paramSupplier = command.CreateParameter();
                paramSupplier.ParameterName = "@supplier";
                paramSupplier.Value = response.SupplierId;
                command.Parameters.Add(paramSupplier);

                // A. Get Last 10 Records for this Supplier
                command.CommandText = @"
                    SELECT TOP 10 v.StartDatumTijd, v.VerkoopPrijs
                    FROM Veilingen v
                    JOIN Producten p ON v.ProductID = p.ProductID
                    WHERE p.Naam = @naam 
                      AND v.VerkoperID = @supplier
                      AND v.VerkoopPrijs IS NOT NULL
                    ORDER BY v.StartDatumTijd DESC";

                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        response.SupplierHistory.Records.Add(new PriceRecordDto
                        {
                            Date = reader.GetDateTime(0),
                            // FIX: Use Convert.ToDouble to handle SQL 'real' (float) vs 'float' (double)
                            Price = Convert.ToDouble(reader.GetValue(1))
                        });
                    }
                }

                // B. Get Average for this Supplier
                command.CommandText = @"
                    SELECT AVG(v.VerkoopPrijs)
                    FROM Veilingen v
                    JOIN Producten p ON v.ProductID = p.ProductID
                    WHERE p.Naam = @naam 
                      AND v.VerkoperID = @supplier
                      AND v.VerkoopPrijs IS NOT NULL";

                var avgSupplier = await command.ExecuteScalarAsync();
                if (avgSupplier != null && avgSupplier != DBNull.Value)
                {
                    response.SupplierHistory.AveragePrice = Convert.ToDouble(avgSupplier);
                }

                // ---------------------------------------------------------
                // Step 3: Query 2 (Market Wide History)
                // ---------------------------------------------------------

                // A. Get Last 10 Records (Market)
                command.CommandText = @"
                    SELECT TOP 10 v.StartDatumTijd, v.VerkoopPrijs, v.VerkoperID
                    FROM Veilingen v
                    JOIN Producten p ON v.ProductID = p.ProductID
                    WHERE p.Naam = @naam 
                      AND v.VerkoopPrijs IS NOT NULL
                    ORDER BY v.StartDatumTijd DESC";

                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        response.MarketHistory.Records.Add(new MarketPriceRecordDto
                        {
                            Date = reader.GetDateTime(0),
                            // FIX: Use Convert.ToDouble here as well
                            Price = Convert.ToDouble(reader.GetValue(1)),
                            SellerId = reader.IsDBNull(2) ? "Unknown" : reader.GetString(2)
                        });
                    }
                }

                // B. Get Average (Market)
                command.CommandText = @"
                    SELECT AVG(v.VerkoopPrijs)
                    FROM Veilingen v
                    JOIN Producten p ON v.ProductID = p.ProductID
                    WHERE p.Naam = @naam 
                      AND v.VerkoopPrijs IS NOT NULL";

                var avgMarket = await command.ExecuteScalarAsync();
                if (avgMarket != null && avgMarket != DBNull.Value)
                {
                    response.MarketHistory.AveragePrice = Convert.ToDouble(avgMarket);
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching history", error = ex.Message });
            }
            finally
            {
                if (connection.State == ConnectionState.Open)
                    await connection.CloseAsync();
            }
        }
    }
}