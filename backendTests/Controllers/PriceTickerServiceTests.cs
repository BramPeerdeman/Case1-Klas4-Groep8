using backend.Hubs;
using backend.interfaces;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace backendTests.Services
{
    public class PriceTickerServiceTests
    {
        [Fact]
        public async Task ExecuteAsync_ShouldBroadcastPriceUpdates()
        {
            // Arrange
            var mockHub = new Mock<IHubContext<AuctionHub>>();
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            var mockAuctionService = new Mock<IAuctionService>();

            // Setup SignalR
            mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
            mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);

            // Setup een actieve veiling
            var auction = new AuctionState
            {
                ProductId = 1,
                IsRunning = true,
                StartPrice = 100,
                MinPrice = 50,
                StartTime = DateTime.Now
            };
            mockAuctionService.Setup(s => s.GetActiveAuction()).Returns(auction);

            var service = new PriceTickerService(mockHub.Object, mockAuctionService.Object);

            // Act
            var cts = new CancellationTokenSource();

            // --- HIER IS DE FIX VOOR JOUW CODE ---
            // Omdat jouw service 2000ms wacht bij start, moet de test langer duren.
            // We stoppen hem pas na 2500ms.
            cts.CancelAfter(2500);

            try
            {
                await service.StartAsync(cts.Token);
                // We wachten hier 3000ms zodat de taak netjes kan afronden na de cancel
                await Task.Delay(3000);
            }
            catch (TaskCanceledException)
            {
                // Dit is normaal, want we cancellen hem
            }

            // Assert
            // Nu heeft hij tijd gehad om te draaien, dus moet hij die update gestuurd hebben
            mockClientProxy.Verify(
                client => client.SendCoreAsync(
                    "PrijsUpdate",
                    It.IsAny<object[]>(),
                    It.IsAny<CancellationToken>()),
                Times.AtLeastOnce);
        }
    }
}