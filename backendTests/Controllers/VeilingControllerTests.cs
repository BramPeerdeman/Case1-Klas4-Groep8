using backend.Controllers;
using backend.Data;
using backend.Hubs;
using backend.interfaces;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Threading.Tasks;
using Xunit;

namespace backend.Controllers.Tests
{
    public class VeilingControllerTests
    {
        // 1. Helper to get a fresh database for every test
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private IAuctionService GetMockAuctionService()
        {
            var mockService = new Mock<IAuctionService>();
            return mockService.Object;
        }

        // 2. Helper to mock the SignalR Hub (needed for the Controller constructor)
        private Mock<IHubContext<AuctionHub>> GetMockHub()
        {
            return new Mock<IHubContext<AuctionHub>>();
        }

        [Fact]
        public async Task StartVeiling_ShouldLinkVeilingToVerkoper_WhenIdIsPresent()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var mockHub = GetMockHub();
            var mockAuctionService = GetMockAuctionService();
            var controller = new VeilingController(context, mockHub.Object, mockAuctionService);

            // Create a product that clearly belongs to Verkoper #99
            var inputProduct = new Product
            {
                ProductID = 1,
                VerkoperID = 99,
                Naam = "Test Product"
            };

            // Act
            var result = await controller.StartVeiling(inputProduct);

            // Assert
            // A. Check if the HTTP response is OK
            var okResult = Assert.IsType<OkObjectResult>(result);
            var resultVeiling = Assert.IsType<Veiling>(okResult.Value);

            // B. CRITICAL: Verify your logic 'veiling.VerkoperID = GeveildProduct.VerkoperID' worked
            Assert.Equal(99, resultVeiling.VerkoperID);

            // C. Double check it actually saved to the database
            var dbVeiling = await context.Veilingen.FirstOrDefaultAsync();
            Assert.NotNull(dbVeiling);
            Assert.Equal(99, dbVeiling.VerkoperID);
        }

        [Fact]
        public async Task StartVeiling_ShouldDefaultToZero_WhenVerkoperIdIsNull()
        {
            // This test explicitly validates your fix: "?? 0"

            // Arrange
            using var context = GetInMemoryDbContext();
            var mockHub = GetMockHub();
            var mockAuctionService = GetMockAuctionService();
            var controller = new VeilingController(context, mockHub.Object, mockAuctionService);

            var inputProduct = new Product
            {
                ProductID = 2,
                VerkoperID = null, // Simulate a data error or missing ID
                Naam = "Ghost Product"
            };

            // Act
            await controller.StartVeiling(inputProduct);

            // Assert
            var dbVeiling = await context.Veilingen.FirstOrDefaultAsync();

            // Should be 0 because of your "?? 0" logic
            Assert.Equal(0, dbVeiling.VerkoperID);
        }

        [Fact]
        public async Task StartVeiling_Assigns_VerkoperID_From_Product()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var mockHub = GetMockHub();
            var mockAuctionService = GetMockAuctionService();
            var controller = new VeilingController(context, mockHub.Object, mockAuctionService);

            var inputProduct = new Product
            {
                ProductID = 10,
                VerkoperID = 5,
                Naam = "Specific Link Test"
            };

            // Act
            var result = await controller.StartVeiling(inputProduct);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var resultVeiling = Assert.IsType<Veiling>(okResult.Value);
            Assert.Equal(5, resultVeiling.VerkoperID);

            var dbVeiling = await context.Veilingen.FirstOrDefaultAsync(v => v.ProductID == 10);
            Assert.NotNull(dbVeiling);
            Assert.Equal(5, dbVeiling.VerkoperID);
        }
    }
}