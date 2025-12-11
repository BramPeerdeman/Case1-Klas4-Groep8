using backend.Controllers;
using backend.interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Threading.Tasks;
using Xunit;

namespace backend.Controllers.Tests
{
    public class VeilingControllerTests
    {
        [Fact]
        public async Task StartVeiling_ShouldCallService_AndReturnOk()
        {
            // Arrange
            var mockService = new Mock<IAuctionService>();

            // Setup: Zorg dat de service taak succesvol afrondt
            mockService.Setup(s => s.StartAuctionAsync(It.IsAny<int>()))
                       .Returns(Task.CompletedTask);

            // De nieuwe constructor verwacht alleen de Service
            var controller = new VeilingController(mockService.Object);

            int testProductId = 1;

            // Act
            // We roepen nu StartVeiling aan met een ID (int) in plaats van een Product object
            var result = await controller.StartVeiling(testProductId);

            // Assert
            // 1. Check of de service daadwerkelijk is aangeroepen met het juiste ID
            mockService.Verify(s => s.StartAuctionAsync(testProductId), Times.Once);

            // 2. Check of we een OK response krijgen
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task StartQueue_ShouldCallService_AndReturnOk()
        {
            // Arrange
            var mockService = new Mock<IAuctionService>();

            // Setup
            mockService.Setup(s => s.StartQueueAsync())
                       .Returns(Task.CompletedTask);

            var controller = new VeilingController(mockService.Object);

            // Act
            var result = await controller.StartQueue();

            // Assert
            mockService.Verify(s => s.StartQueueAsync(), Times.Once);
            Assert.IsType<OkObjectResult>(result);
        }
    }
}