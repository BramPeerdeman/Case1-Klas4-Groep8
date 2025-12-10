using backend.Controllers;
using backend.Data;
using backend.Hubs;
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
            var controller = new VeilingController(context, mockHub.Object);

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
            var controller = new VeilingController(context, mockHub.Object);

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
        public async Task PriceMovement_ShouldBroadcast_WhenPriceIsHigher()
        {
            // Even though this is "live" logic, it affects the Veiler's profit, 
            // so it's good to have one test for it.

            // Arrange
            using var context = GetInMemoryDbContext();
            var mockHub = GetMockHub();

            // We need to mock the "Clients.All.SendAsync" call chain
            var mockClientProxy = new Mock<IClientProxy>();
            var mockClients = new Mock<IHubClients>();

            mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);
            mockHub.Setup(h => h.Clients).Returns(mockClients.Object);

            var controller = new VeilingController(context, mockHub.Object);

            // Act
            // Bid 100, Min Price 50 -> Should succeed
            var result = await controller.PriceMovement(100, 50);

            // Assert
            Assert.IsType<OkObjectResult>(result);

            // Verify that SignalR actually tried to send "PrijsUpdate"
            mockClientProxy.Verify(
                client => client.SendCoreAsync(
                    "PrijsUpdate",
                    It.Is<object[]>(o => o != null && o.Length > 0),
                    default),
                Times.Once);
        }
    }
}