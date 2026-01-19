using backend.Controllers;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace backendTests.Controllers
{
    public class GebruikerControllerTests
    {
        private readonly Mock<UserManager<Gebruiker>> _mockUserManager;
        private readonly GebruikerController _controller;
        private readonly Mock<IServiceProvider> _mockServiceProvider;
        private readonly Mock<IConfiguration> _mockConfig;

        public GebruikerControllerTests()
        {
            // 1. Mock de UserManager (Dit is altijd een gedoe in Identity, maar dit is de standaard manier)
            var store = new Mock<IUserStore<Gebruiker>>();
            _mockUserManager = new Mock<UserManager<Gebruiker>>(store.Object, null, null, null, null, null, null, null, null);

            _controller = new GebruikerController(_mockUserManager.Object);

            // 2. Mock de HttpContext & Configuration (nodig voor GenerateJwtToken)
            _mockServiceProvider = new Mock<IServiceProvider>();
            _mockConfig = new Mock<IConfiguration>();

            // Fake settings voor JWT
            _mockConfig.Setup(c => c["Jwt:Key"]).Returns("SuperGeheimWachtwoordDatLangGenoegIsVoorHMACSHA256!");
            _mockConfig.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");
            _mockConfig.Setup(c => c["Jwt:Audience"]).Returns("TestAudience");

            _mockServiceProvider.Setup(x => x.GetService(typeof(IConfiguration))).Returns(_mockConfig.Object);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { RequestServices = _mockServiceProvider.Object }
            };
        }

        [Fact]
        public async Task UpdateUsername_Success_ReturnsOkWithToken()
        {
            // Arrange
            var user = new Koper { Id = "1", UserName = "Oud", Email = "a@b.c" };
            var dto = new UpdateUsernameDto { NewUsername = "Nieuw", CurrentPassword = "Pass" };

            // Setup: User gevonden
            _mockUserManager.Setup(m => m.FindByIdAsync("1")).ReturnsAsync(user);
            // Setup: Wachtwoord correct
            _mockUserManager.Setup(m => m.CheckPasswordAsync(user, "Pass")).ReturnsAsync(true);
            // Setup: Update gelukt
            _mockUserManager.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.UpdateUsername("1", dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("Token", okResult.Value.ToString()); // Check of er een token terugkomt
            Assert.Equal("Nieuw", user.UserName); // Check of naam is aangepast
        }

        [Fact]
        public async Task UpdateUsername_WrongPassword_ReturnsUnauthorized()
        {
            // Arrange
            var user = new Koper { Id = "1" };
            var dto = new UpdateUsernameDto { CurrentPassword = "Fout" };

            _mockUserManager.Setup(m => m.FindByIdAsync("1")).ReturnsAsync(user);
            _mockUserManager.Setup(m => m.CheckPasswordAsync(user, "Fout")).ReturnsAsync(false);

            // Act
            var result = await _controller.UpdateUsername("1", dto);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task GetUiSettings_ReturnsSettings()
        {
            // Arrange
            var user = new Koper { Id = "1", UiSettings = "{\"DarkMode\":true}" };
            _mockUserManager.Setup(m => m.FindByIdAsync("1")).ReturnsAsync(user);

            // Act
            var result = await _controller.GetUiSettings("1");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var settings = Assert.IsType<UiSettings>(okResult.Value);
            // Let op: UiSettings class definitie ken ik niet exact, maar we testen of hij deserialized
            Assert.NotNull(settings);
        }

        [Fact]
        public async Task UpdateUiSettings_SavesJson()
        {
            // Arrange
            var user = new Koper { Id = "1" };
            var newSettings = new UiSettings { /* vul velden in als die er zijn */ };

            _mockUserManager.Setup(m => m.FindByIdAsync("1")).ReturnsAsync(user);
            _mockUserManager.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.UpdateUiSettings("1", newSettings);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(user.UiSettings); // Check of het is opgeslagen in de user string
        }
    }
}