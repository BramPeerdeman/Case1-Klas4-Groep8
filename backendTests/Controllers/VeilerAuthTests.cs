using backend.Controllers;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using System.Threading.Tasks;
using Xunit;
using Assert = Xunit.Assert;

namespace backend.Controllers.Tests
{
    public class VeilerAuthTests
    {
        private readonly AuthController _controller;
        private readonly Mock<UserManager<Gebruiker>> _userManagerMock;
        private readonly FakeSignInManager _fakeSignInManager;
        private readonly Mock<IConfiguration> _configMock;

        public VeilerAuthTests()
        {
            // Setup identical to your existing AuthControllerTests
            var store = new Mock<IUserStore<Gebruiker>>();
            _userManagerMock = new Mock<UserManager<Gebruiker>>(store.Object, null, null, null, null, null, null, null, null);

            _fakeSignInManager = new FakeSignInManager(_userManagerMock.Object);

            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns("this_is_a_very_long_test_key_for_unit_tests_1234567890");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("testIssuer");
            _configMock.Setup(c => c["Jwt:Audience"]).Returns("testAudience");

            _controller = new AuthController(_userManagerMock.Object, _fakeSignInManager, _configMock.Object);
        }

        [Fact]
        public async Task Register_Veiler_ReturnsBadRequest_WhenKvkNummerIsMissing()
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                Email = "veiler@test.com",
                Gebruikersnaam = "veiler1",
                Wachtwoord = "Pass123!",
                Type = "veiler",
                KvkNummer = "" // Lege KVK om validation failure te triggeren
            };

            // Mock that the user does not exist yet
            _userManagerMock.Setup(u => u.FindByEmailAsync(registerDto.Email))
                            .ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(registerDto.Gebruikersnaam))
                            .ReturnsAsync((Gebruiker)null);

            // Act
            var result = await _controller.Register(registerDto);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            // Validating the specific error message from AuthController.cs line 70
            Assert.Equal("KVK-nummer is verplicht voor veilers.", badRequestResult.Value);
        }

        [Fact]
        public async Task Register_Veiler_ReturnsOk_WhenValidAndAssignsRole()
        {
            // Arrange
            var registerDto = new RegisterDto
            {
                Email = "veiler_valid@test.com",
                Gebruikersnaam = "veiler_valid",
                Wachtwoord = "Pass123!",
                Type = "veiler",
                KvkNummer = "12345678" // Valid KVK
            };

            _userManagerMock.Setup(u => u.FindByEmailAsync(registerDto.Email))
                            .ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(registerDto.Gebruikersnaam))
                            .ReturnsAsync((Gebruiker)null);

            // Verify we are creating a 'Veiler' type, not just a generic 'Gebruiker'
            _userManagerMock.Setup(u => u.CreateAsync(It.IsAny<Veiler>(), registerDto.Wachtwoord))
                            .ReturnsAsync(IdentityResult.Success);

            // Verify we are adding the specific role "veiler"
            _userManagerMock.Setup(u => u.AddToRoleAsync(It.IsAny<Veiler>(), "veiler"))
                            .ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.Register(registerDto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);

            // Verify the specific KvkNummer was set on the model passed to CreateAsync
            _userManagerMock.Verify(u => u.CreateAsync(It.Is<Veiler>(v => v.KvkNummer == "12345678"), registerDto.Wachtwoord), Times.Once);
        }
    }
}