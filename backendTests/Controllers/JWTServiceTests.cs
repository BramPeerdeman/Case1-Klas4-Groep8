using backend.Helper;
using backend.Models;
using Microsoft.Extensions.Configuration;
using Moq;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace backendTests.Helper
{
    public class JwtServiceTests
    {
        private readonly Mock<IConfiguration> _mockConfig;
        private readonly JwtService _service;

        public JwtServiceTests()
        {
            _mockConfig = new Mock<IConfiguration>();

            // Setup fake waarden die normaal in appsettings.json staan
            _mockConfig.Setup(c => c["Jwt:Key"]).Returns("DitIsEenHeelGeheimWachtwoordVoorDeTestOmgeving123!");
            _mockConfig.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");
            _mockConfig.Setup(c => c["Jwt:Audience"]).Returns("TestAudience");

            _service = new JwtService(_mockConfig.Object);
        }

        [Fact]
        public void GenerateJwtToken_ShouldReturnValidString()
        {
            // Arrange
            var user = new Koper
            {
                Id = "user-1",
                UserName = "TestKees",
                Email = "kees@test.nl"
            };

            // Act
            var token = _service.GenerateJwtToken(user);

            // Assert
            Assert.False(string.IsNullOrEmpty(token));

            // Extra check: Kunnen we de token lezen?
            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadToken(token) as JwtSecurityToken;

            Assert.NotNull(jsonToken);
            Assert.Equal("TestIssuer", jsonToken.Issuer);
            Assert.Equal("TestAudience", jsonToken.Audiences.First());

            // Check of de claims erin zitten
            var subClaim = jsonToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value;
            var nameClaim = jsonToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Name).Value;

            Assert.Equal("user-1", subClaim);
            Assert.Equal("TestKees", nameClaim);
        }
    }
}