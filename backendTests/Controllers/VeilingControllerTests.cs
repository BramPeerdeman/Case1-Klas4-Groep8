using backend.Controllers;
using backend.interfaces;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace backend.Controllers.Tests
{
    public class VeilingControllerTests
    {
        private readonly Mock<IAuctionService> _mockService;
        private readonly VeilingController _controller;

        public VeilingControllerTests()
        {
            _mockService = new Mock<IAuctionService>();
            _controller = new VeilingController(_mockService.Object);
        }

        [Fact]
        public async Task StartVeiling_ShouldCallService_AndReturnOk()
        {
            // Arrange
            int testProductId = 1;
            _mockService.Setup(s => s.StartAuctionAsync(testProductId)).Returns(Task.CompletedTask);

            // Act
            var result = await _controller.StartVeiling(testProductId);

            // Assert
            _mockService.Verify(s => s.StartAuctionAsync(testProductId), Times.Once);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public void GetActive_ShouldReturnOk_WithAuction()
        {
            // Arrange
            var auction = new AuctionState { ProductId = 1, IsRunning = true };
            _mockService.Setup(s => s.GetActiveAuction()).Returns(auction);

            // Act
            var result = _controller.GetActive();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(auction, okResult.Value);
        }

        [Fact]
        public void GetActive_ShouldReturnNotFound_WhenNoAuction()
        {
            // Arrange
            _mockService.Setup(s => s.GetActiveAuction()).Returns((AuctionState)null);

            // Act
            var result = _controller.GetActive();

            // Assert
            // Let op: In je huidige controller code return je NotFound() als hij null is.
            // (Als je mijn eerdere fix had toegepast was het Ok(null), maar ik volg hier de code uit je upload)
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public void GetQueueIds_ShouldReturnList()
        {
            // Arrange
            var ids = new List<int> { 1, 2, 3 };
            _mockService.Setup(s => s.GetQueueIds()).Returns(ids);

            // Act
            var result = _controller.GetQueueIds();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(ids, okResult.Value);
        }

        [Fact]
        public void AddToQueue_ShouldCallService()
        {
            // Arrange
            var ids = new List<int> { 1, 2 };

            // Act
            var result = _controller.AddToQueue(ids);

            // Assert
            _mockService.Verify(s => s.AddToQueue(ids), Times.Once);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task StartQueue_ShouldCallService()
        {
            // Act
            var result = await _controller.StartQueue();

            // Assert
            _mockService.Verify(s => s.StartQueueAsync(), Times.Once);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Koop_ValidRequest_ReturnsOk()
        {
            // Arrange
            var request = new KoopRequest { ProductId = 1, BuyerName = "Jan", Aantal = 1 };
            _mockService
                .Setup(s => s.PlaatsBod(request.ProductId, request.BuyerName, request.BuyerId, request.Aantal))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.Koop(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            // Je kunt checken of de message in het resultaat zit als je wilt
        }

        [Fact]
        public async Task Koop_InvalidRequest_ReturnsBadRequest()
        {
            // Arrange
            var request = new KoopRequest { ProductId = 1, BuyerName = "Jan" };
            _mockService
                .Setup(s => s.PlaatsBod(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync(false);

            // Act
            var result = await _controller.Koop(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task ForceNext_ShouldCallService()
        {
            // Act
            var result = await _controller.ForceNext();

            // Assert
            _mockService.Verify(s => s.ForceNextAsync(), Times.Once);
            Assert.IsType<OkObjectResult>(result);
        }
    }
}