using backend.Data;
using backend.Hubs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace backendTests.Services
{
    public class AuctionServiceTests
    {
        private readonly Mock<IHubContext<AuctionHub>> _mockHub;
        private readonly AuctionService _service;
        private readonly AppDbContext _dbContext;

        public AuctionServiceTests()
        {
            // 1. Setup In-Memory Database met unieke naam per test
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _dbContext = new AppDbContext(options);
            _dbContext.Database.EnsureCreated();

            // 2. Mock SignalR Hub
            _mockHub = new Mock<IHubContext<AuctionHub>>();
            _mockHub.Setup(h => h.Clients.All).Returns(Mock.Of<IClientProxy>());

            // 3. Setup ServiceScopeFactory (nodig omdat AuctionService scopes gebruikt)
            var services = new ServiceCollection();
            services.AddSingleton(_dbContext); // Voeg de in-memory db toe aan de provider
            var serviceProvider = services.BuildServiceProvider();

            var mockScopeFactory = new Mock<IServiceScopeFactory>();
            var mockScope = new Mock<IServiceScope>();

            mockScopeFactory.Setup(x => x.CreateScope()).Returns(mockScope.Object);
            mockScope.Setup(x => x.ServiceProvider).Returns(serviceProvider);

            // 4. Instantieer de service
            _service = new AuctionService(mockScopeFactory.Object, _mockHub.Object);
        }

        [Fact]
        public async Task StartAuctionAsync_ShouldInitializeAuction_WhenProductExists()
        {
            // Arrange
            var product = new Product { ProductID = 1, Naam = "Test Bloem", StartPrijs = 100, MinPrijs = 50, Aantal = 10, IsAuctionable = true };
            _dbContext.Producten.Add(product);
            _dbContext.SaveChanges();

            // Act
            await _service.StartAuctionAsync(1);

            // Assert
            var activeAuction = _service.GetActiveAuction();
            Assert.NotNull(activeAuction);
            Assert.Equal(1, activeAuction.ProductId);
            Assert.True(activeAuction.IsRunning);
            Assert.Equal(100, activeAuction.StartPrice);
            Assert.Equal(100, activeAuction.CurrentPrice);

            // Verify SignalR call
            _mockHub.Verify(h => h.Clients.All.SendCoreAsync("ReceiveNewAuction", It.IsAny<object[]>(), default), Times.Once);
        }

        [Fact]
        public async Task StartAuctionAsync_ShouldCreateEmptyAuction_WhenProductDoesNotExist()
        {
            // Act
            await _service.StartAuctionAsync(999); // Bestaat niet

            // Assert
            var activeAuction = _service.GetActiveAuction();
            Assert.NotNull(activeAuction);
            Assert.Equal(999, activeAuction.ProductId);
            Assert.Equal(0, activeAuction.StartPrice); // Default
        }

        [Fact]
        public async Task PlaatsBod_ValidBid_ShouldSellProduct_AndReduceStock()
        {
            // Arrange
            var product = new Product { ProductID = 2, Naam = "Roos", StartPrijs = 80, MinPrijs = 40, Aantal = 5, IsAuctionable = true };
            _dbContext.Producten.Add(product);
            _dbContext.SaveChanges();

            await _service.StartAuctionAsync(2); // Start de veiling

            // Act
            // We kopen 2 stuks
            var result = await _service.PlaatsBod(2, "KoperJan", "user-123", 2);

            // Assert
            Assert.True(result); // Bod moet geaccepteerd zijn

            var auction = _service.GetStatus(2);
            Assert.True(auction.IsSold);
            Assert.False(auction.IsRunning);
            Assert.Equal("KoperJan", auction.BuyerName);

            // Check database: voorraad moet 5 - 2 = 3 zijn
            var dbProduct = await _dbContext.Producten.FindAsync(2);
            Assert.Equal(3, dbProduct.Aantal);

            // Check of er een Veiling record is aangemaakt
            var receipt = await _dbContext.Veilingen.FirstOrDefaultAsync(v => v.ProductID == 2);
            Assert.NotNull(receipt);
            Assert.Equal(2, receipt.Aantal);
        }

        [Fact]
        public async Task PlaatsBod_ShouldFail_WhenNoActiveAuction()
        {
            // Act (Niet gestart)
            var result = await _service.PlaatsBod(3, "Koper", "id", 1);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task PlaatsBod_ShouldFail_WhenStockIsInsufficient()
        {
            // Arrange
            var product = new Product { ProductID = 4, Naam = "Tulp", StartPrijs = 10, Aantal = 1, IsAuctionable = true };
            _dbContext.Producten.Add(product);
            _dbContext.SaveChanges();
            await _service.StartAuctionAsync(4);

            // Act (We willen er 5 kopen, maar hebben er maar 1)
            var result = await _service.PlaatsBod(4, "GretigeKoper", "id", 5);

            // Assert
            Assert.False(result);

            // Check dat veiling nog steeds loopt
            var auction = _service.GetStatus(4);
            Assert.True(auction.IsRunning);
            Assert.False(auction.IsSold);
        }

        [Fact]
        public async Task TimeoutAuction_ShouldMarkAsNotSold()
        {
            // Arrange
            var product = new Product { ProductID = 5, Naam = "Oude Bloem", StartPrijs = 10, Aantal = 10 };
            _dbContext.Producten.Add(product);
            _dbContext.SaveChanges();
            await _service.StartAuctionAsync(5);

            // Act
            await _service.TimeoutAuction(5);

            // Assert
            var auction = _service.GetStatus(5);
            Assert.False(auction.IsRunning);
            Assert.False(auction.IsSold);

            // Verify SignalR message (sold = false)
            _mockHub.Verify(h => h.Clients.All.SendCoreAsync("ReceiveAuctionResult", It.IsAny<object[]>(), default), Times.AtLeastOnce);
        }

        [Fact]
        public void AddToQueue_ShouldOnlyAddValidProducts()
        {
            // Arrange
            var validProduct = new Product { ProductID = 10, Naam = "Valid", BeginDatum = DateTime.Today.AddDays(-1), Aantal = 10, IsAuctionable = true };
            var futureProduct = new Product { ProductID = 11, Naam = "Future", BeginDatum = DateTime.Today.AddDays(1), Aantal = 10, IsAuctionable = true };
            var noStockProduct = new Product { ProductID = 12, Naam = "Empty", BeginDatum = DateTime.Today, Aantal = 0, IsAuctionable = true };

            _dbContext.Producten.AddRange(validProduct, futureProduct, noStockProduct);
            _dbContext.SaveChanges();

            // Act
            _service.AddToQueue(new List<int> { 10, 11, 12 });

            // Assert
            var queue = _service.GetQueueIds();
            Assert.Single(queue); // Alleen ID 10 mag erin zitten
            Assert.Contains(10, queue);
        }

        [Fact]
        public void RemoveFromQueue_ShouldRemoveId()
        {
            // Arrange
            var product = new Product { ProductID = 20, BeginDatum = DateTime.Today, Aantal = 5, IsAuctionable = true };
            _dbContext.Producten.Add(product);
            _dbContext.SaveChanges();
            _service.AddToQueue(new List<int> { 20 });

            // Act
            _service.RemoveFromQueue(20);

            // Assert
            Assert.Empty(_service.GetQueueIds());
        }

        [Fact]
        public async Task MoveNewAuctionableProductsAsync_ShouldUpdateFlags()
        {
            // Arrange
            var p1 = new Product { ProductID = 30, IsAuctionable = false, StartPrijs = 10, Aantal = 5 };
            var p2 = new Product { ProductID = 31, IsAuctionable = true, StartPrijs = 10, Aantal = 5 }; // Al true
            _dbContext.Producten.AddRange(p1, p2);
            _dbContext.SaveChanges();

            // Act
            await _service.MoveNewAuctionableProductsAsync();

            // Assert
            var dbP1 = await _dbContext.Producten.FindAsync(30);
            Assert.True(dbP1.IsAuctionable);
        }
    }
}