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
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;
using Assert = Xunit.Assert;
using IdentitySignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace backend.Controllers.Tests
{
    // Fake class om SignInManager te kunnen mocken
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
            var store = new Mock<IUserStore<Gebruiker>>();
            _userManagerMock = new Mock<UserManager<Gebruiker>>(store.Object, null, null, null, null, null, null, null, null);

            _fakeSignInManager = new FakeSignInManager(_userManagerMock.Object);

            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns("DitIsEenLangeGeheimeSleutelVoorTests123!");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("testIssuer");
            _configMock.Setup(c => c["Jwt:Audience"]).Returns("testAudience");

            _controller = new AuthController(_userManagerMock.Object, _fakeSignInManager, _configMock.Object);
        }

        // --- REGISTER TESTS ---

        [Fact]
        public async Task Register_EmailExists_ReturnsBadRequest()
        {
            // Arrange
            var dto = new RegisterDto { Email = "bestaat@al.nl", Gebruikersnaam = "nieuw", Type = "koper" };
            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email))
                            .ReturnsAsync(new Koper()); // User gevonden

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Een gebruiker met deze e-mail bestaat al.", badRequest.Value);
        }

        [Fact]
        public async Task Register_UsernameExists_ReturnsBadRequest()
        {
            // Arrange
            var dto = new RegisterDto { Email = "nieuw@test.nl", Gebruikersnaam = "bestaatAl", Type = "koper" };
            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(dto.Gebruikersnaam))
                            .ReturnsAsync(new Koper()); // User gevonden op naam

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Deze gebruikersnaam is al in gebruik.", badRequest.Value);
        }

        [Fact]
        public async Task Register_VeilerNoKvk_ReturnsBadRequest()
        {
            // Arrange
            var dto = new RegisterDto { Email = "veiler@test.nl", Gebruikersnaam = "veiler", Type = "veiler", KvkNummer = "" };
            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(dto.Gebruikersnaam)).ReturnsAsync((Gebruiker)null);

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("KVK-nummer is verplicht voor veilers.", badRequest.Value);
        }

        [Fact]
        public async Task Register_InvalidType_ReturnsBadRequest()
        {
            // Arrange
            var dto = new RegisterDto { Email = "x@y.z", Gebruikersnaam = "x", Type = "hacker" };

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Ongeldig gebruikerstype.", badRequest.Value);
        }

        [Fact]
        public async Task Register_CreateFailed_ReturnsBadRequest()
        {
            // Arrange
            var dto = new RegisterDto { Email = "a@b.c", Gebruikersnaam = "u", Type = "koper", Wachtwoord = "Pass" };
            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync((Gebruiker)null);
            _userManagerMock.Setup(u => u.FindByNameAsync(dto.Gebruikersnaam)).ReturnsAsync((Gebruiker)null);

            // Simuleer dat CreateAsync faalt (bv. wachtwoord te zwak)
            _userManagerMock.Setup(u => u.CreateAsync(It.IsAny<Gebruiker>(), dto.Wachtwoord))
                            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Weak password" }));

            // Act
            var result = await _controller.Register(dto);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        // --- LOGIN TESTS ---

        [Fact]
        public async Task Login_WrongPassword_ReturnsUnauthorized()
        {
            // Arrange
            var dto = new LoginDto { Email = "user@test.nl", Wachtwoord = "FoutWachtwoord" };
            var user = new Koper { Email = dto.Email };

            _userManagerMock.Setup(u => u.FindByEmailAsync(dto.Email)).ReturnsAsync(user);
            _fakeSignInManager.ResultToReturn = IdentitySignInResult.Failed; // Login mislukt

            // Act
            var result = await _controller.Login(dto);

            // Assert
            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Ongeldige e-mail of wachtwoord.", unauthorized.Value);
        }

        // --- GET ME TESTS ---

        [Fact]
        public async Task GetMijnGegevens_ReturnsOk_WhenUserFound()
        {
            // Arrange
            var userId = "user-123";
            var user = new Koper { Id = userId, UserName = "Piet", Email = "piet@mail.nl", Voornaam = "Piet", Achternaam = "Jansen" };

            SetUserContext(userId); // Simuleer ingelogde gebruiker
            _userManagerMock.Setup(u => u.FindByIdAsync(userId)).ReturnsAsync(user);

            // Act
            var result = await _controller.GetMijnGegevens();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            // Check property values met reflection of dynamic
            dynamic val = okResult.Value;
            Assert.Equal("Piet", (string)val.GetType().GetProperty("gebruikersnaam").GetValue(val, null));
        }

        [Fact]
        public async Task GetMijnGegevens_ReturnsNotFound_WhenUserDeleted()
        {
            // Arrange
            SetUserContext("deleted-user");
            _userManagerMock.Setup(u => u.FindByIdAsync("deleted-user")).ReturnsAsync((Gebruiker)null);

            // Act
            var result = await _controller.GetMijnGegevens();

            // Assert
            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("Gebruiker niet gevonden", notFound.Value);
        }

        // --- UPDATE PROFIEL TESTS ---

        [Fact]
        public async Task UpdateProfiel_Success_ReturnsOk()
        {
            // Arrange
            var userId = "u1";
            var user = new Koper { Id = userId, UserName = "Oud" };
            var dto = new UpdateProfielDto { NieuweGebruikersnaam = "Nieuw", NieuweEmail = "nieuw@mail.nl" };

            SetUserContext(userId);
            _userManagerMock.Setup(u => u.FindByIdAsync(userId)).ReturnsAsync(user);
            _userManagerMock.Setup(u => u.FindByNameAsync("Nieuw")).ReturnsAsync((Gebruiker)null); // Naam is vrij
            _userManagerMock.Setup(u => u.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

            // Act
            var result = await _controller.UpdateProfiel(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Nieuw", user.UserName);
            Assert.Equal("nieuw@mail.nl", user.Email);
        }

        [Fact]
        public async Task UpdateProfiel_NameTaken_ReturnsBadRequest()
        {
            // Arrange
            var userId = "u1";
            var otherUser = new Koper { Id = "u2", UserName = "Bezet" };
            var dto = new UpdateProfielDto { NieuweGebruikersnaam = "Bezet" };

            SetUserContext(userId);
            _userManagerMock.Setup(u => u.FindByIdAsync(userId)).ReturnsAsync(new Koper { Id = userId });
            _userManagerMock.Setup(u => u.FindByNameAsync("Bezet")).ReturnsAsync(otherUser); // Naam bestaat al bij ander

            // Act
            var result = await _controller.UpdateProfiel(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Deze gebruikersnaam is al in gebruik.", badRequest.Value);
        }

        [Fact]
        public async Task UpdateProfiel_ChangePassword_WithoutCurrent_ReturnsBadRequest()
        {
            // Arrange
            SetUserContext("u1");
            _userManagerMock.Setup(u => u.FindByIdAsync("u1")).ReturnsAsync(new Koper());

            var dto = new UpdateProfielDto { NieuwWachtwoord = "NewPass", HuidigWachtwoord = "" }; // Leeg huidig WW

            // Act
            var result = await _controller.UpdateProfiel(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Vul uw huidige wachtwoord in om het te kunnen wijzigen.", badRequest.Value);
        }

        [Fact]
        public async Task UpdateProfiel_ChangePassword_Fails_ReturnsBadRequest()
        {
            // Arrange
            var user = new Koper { Id = "u1" };
            var dto = new UpdateProfielDto { NieuwWachtwoord = "New", HuidigWachtwoord = "Old" };

            SetUserContext("u1");
            _userManagerMock.Setup(u => u.FindByIdAsync("u1")).ReturnsAsync(user);

            // Simuleer fout bij wachtwoord wijzigen (bv. oud wachtwoord fout)
            _userManagerMock.Setup(u => u.ChangePasswordAsync(user, "Old", "New"))
                            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Wrong password" }));

            // Act
            var result = await _controller.UpdateProfiel(dto);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        }

        // --- HELPER METHODE ---
        // Deze methode zorgt dat 'User.FindFirst' werkt in de controller
        private void SetUserContext(string userId)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("sub", userId),
                new Claim("id", userId)
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }
    }
}