using backend.Controllers;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using Assert = Xunit.Assert;
using IdentitySignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace backend.Controllers.Tests
{
    public class FakeSignInManager : SignInManager<Gebruiker>
    {
        public FakeSignInManager(UserManager<Gebruiker> userManager)
            : base(userManager,
                   new Mock<IHttpContextAccessor>().Object,
                   new Mock<IUserClaimsPrincipalFactory<Gebruiker>>().Object,
                   new Mock<IOptions<IdentityOptions>>().Object,
                   new Mock<ILogger<SignInManager<Gebruiker>>>().Object,
                   new Mock<IAuthenticationSchemeProvider>().Object,
                   new Mock<IUserConfirmation<Gebruiker>>().Object)
        { }

        public IdentitySignInResult ResultToReturn { get; set; } = IdentitySignInResult.Success;

        public override Task<IdentitySignInResult> CheckPasswordSignInAsync(Gebruiker user, string password, bool lockoutOnFailure)
            => Task.FromResult(ResultToReturn);
    }


    public class AuthControllerTests
    {
        private readonly AuthController _controller;
        private readonly Mock<UserManager<Gebruiker>> _userManagerMock;
        private readonly FakeSignInManager _fakeSignInManager;
        private readonly Mock<IConfiguration> _configMock;
        public AuthControllerTests()
        {
            // Hier zou je de benodigde dependencies moeten mocken en de controller initialiseren
            // Bijvoorbeeld met Moq of een andere mocking library
            var store = new Mock<IUserStore<Gebruiker>>();
            _userManagerMock = new Mock<UserManager<Gebruiker>>(store.Object, null, null, null, null, null, null, null, null);
            var contextAccessor = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
            var userPrincipalFactory = new Mock<IUserClaimsPrincipalFactory<Gebruiker>>();
            _fakeSignInManager = new FakeSignInManager(_userManagerMock.Object);
            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns("this_is_a_very_long_test_key_for_unit_tests_1234567890");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("testIssuer");
            _configMock.Setup(c => c["Jwt:Audience"]).Returns("testAudience");

            _controller = new AuthController(_userManagerMock.Object, _fakeSignInManager, _configMock.Object);
        }

        [Fact]
        public async Task Register_ShouldReturnBadRequest_WhenEmailAlreadyExists()
        {
            // Arrange
            var registerDto = new backend.DTOs.RegisterDto
            {
                Email = "test@mail",
                Gebruikersnaam = "user1",
                Wachtwoord = "Pass123!",
                Type = "koper"
            };
            _userManagerMock.Setup(u => u.FindByEmailAsync(registerDto.Email))
                            .ReturnsAsync(new Koper { Email = registerDto.Email});

            // Act
            var result = await _controller.Register(registerDto);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Een gebruiker met deze e-mail bestaat al.", badRequestResult.Value);
        }

        [Fact]
        public async Task Register_ReturnsOk_WhenUserCreated()
        {
            var dto = new RegisterDto
            {
                Email = "new@test.com",
                Gebruikersnaam = "newuser",
                Wachtwoord = "Pass123!",
                Type = "koper"
            };

            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(dto.Gebruikersnaam)).ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.CreateAsync(It.IsAny<Koper>(), dto.Wachtwoord))
                            .ReturnsAsync(IdentityResult.Success);
            _userManagerMock.Setup(u => u.AddToRoleAsync(It.IsAny<Koper>(), "koper"))
                            .ReturnsAsync(IdentityResult.Success);

            var result = await _controller.Register(dto);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<RegisterResponseDto>(okResult.Value);
            Assert.Equal("Gebruiker succesvol geregistreerd.", response.Message);
        }


        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
        {
            // Arrange
            var dto = new LoginDto { Email = "missing@test.com", Wachtwoord = "Pass123!" };
            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync((Gebruiker)null);

            // Act
            var result = await _controller.Login(dto);

            // Assert
            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Ongeldige e-mail of wachtwoord.", unauthorized.Value);
        }

        [Fact]
        public async Task Login_ReturnsOk_WhenCredentialsValid()
        {
            // Arrange
            var dto = new LoginDto { Email = "valid@test.com", Wachtwoord = "Pass123!" };
            var user = new Koper { Id = "123", Email = dto.Email, UserName = "validuser" };

            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync(user);
            _fakeSignInManager.ResultToReturn = IdentitySignInResult.Success;
            _userManagerMock.Setup(u => u.GetRolesAsync(user)).ReturnsAsync(new[] { "koper" });

            // Act
            var result = await _controller.Login(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var userDto = Assert.IsType<UserDto>(okResult.Value);
            Assert.Equal(dto.Email, userDto.Email);
            Assert.Equal("validuser", userDto.Gebruikersnaam);
            Assert.False(string.IsNullOrEmpty(userDto.Token));
        }
    }
}