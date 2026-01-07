using backend.Controllers;
using backend.Data;
using backend.DTOs; // <--- Belangrijk voor de nieuwe input
using backend.interfaces;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting; // <--- Nodig voor Environment
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders; // Nodig voor de Fake
using System.Reflection;
using Xunit;

namespace backend.Controllers.Tests
{
    public class ProductControllerTests
    {
        // Helper method voor In-Memory Database
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private ProductService GetProductService()
        {
            using var context = GetInMemoryDbContext();
            return new Services.ProductService(context);
        }

        // We hebben een 'nep' omgeving nodig omdat de controller nu IWebHostEnvironment gebruikt
        private IWebHostEnvironment GetFakeEnvironment()
        {
            return new FakeWebHostEnvironment();
        }

        // -------------------------------------------------------------------
        // VEILER SPECIFIC TESTS
        // -------------------------------------------------------------------

        [Fact]
        public void CreateProduct_ShouldBeRestrictedToVeilerRole()
        {
            // Arrange
            var methodInfo = typeof(ProductController).GetMethod(nameof(ProductController.CreateProduct));

            // Act
            var authorizeAttribute = methodInfo.GetCustomAttribute<AuthorizeAttribute>();

            // Assert
            Assert.NotNull(authorizeAttribute);
            Assert.Equal("veiler", authorizeAttribute.Roles);
        }

        [Fact]
        public async Task CreateProduct_ReturnsCreatedAtAction_WhenProductIsValid()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            ProductService productService = GetProductService();
            var fakeEnv = GetFakeEnvironment();

            // UPDATE: Constructor heeft nu 3 parameters
            var controller = new ProductController(context, productService, fakeEnv);

            // UPDATE: We gebruiken nu de DTO in plaats van het Model als input
            var newProductDto = new ProductCreateDto
            {
                Naam = "Veiling Item 1",
                Beschrijving = "Een prachtige antieke vaas",
                MinPrijs = 50,
                Aantal = 1,
                // VerkoperID sturen we niet mee, dat haalt de controller uit de User
            };

            // FIX VOOR USER CONTEXT:
            // We moeten de controller laten denken dat er iemand is ingelogd.
            var claims = new List<System.Security.Claims.Claim>
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "1")
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "TestAuth");
            var claimsPrincipal = new System.Security.Claims.ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = claimsPrincipal }
            };

            // Act
            var result = await controller.CreateProduct(newProductDto);

            // Assert
            // 1. Check Response Type
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var returnedProduct = Assert.IsType<Product>(createdResult.Value);

            // 2. Check Data Integrity
            Assert.Equal("Veiling Item 1", returnedProduct.Naam);

            // 3. Verify it was actually saved to the Database
            Assert.Equal(1, await context.Producten.CountAsync());
        }

        [Fact]
        public async Task CreateProduct_ReturnsBadRequest_WhenModelIsInvalid()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            ProductService productService = GetProductService();
            var fakeEnv = GetFakeEnvironment();
            var controller = new ProductController(context, productService, fakeEnv);

            // Manually trigger validation error
            controller.ModelState.AddModelError("Naam", "The Naam field is required.");

            // Input is nu DTO
            var invalidProduct = new ProductCreateDto { Beschrijving = "Missing Name" };

            // Act
            var result = await controller.CreateProduct(invalidProduct);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task GetUnassignedProducts_ReturnsOnlyProductsWithoutStartPrijs()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            ProductService productService = GetProductService();

            context.Producten.Add(new Product { Naam = "Veilbaar", StartPrijs = 10 });
            context.Producten.Add(new Product { Naam = "Niet Veilbaar", StartPrijs = null });
            await context.SaveChangesAsync();

            // Constructor update
            var controller = new ProductController(context, productService, GetFakeEnvironment());

            // Act
            var result = await controller.GetUnassignedProducts();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var products = Assert.IsType<List<Product>>(okResult.Value);

            Assert.Single(products);
            Assert.Equal("Niet Veilbaar", products[0].Naam);
        }

        [Fact]
        public async Task Admin_UpdateProductPrice_Should_Update_Price_In_Database()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            ProductService productService = GetProductService();
            var testProduct = new Product
            {
                ProductID = 1,
                Naam = "Test Bloem",
                StartPrijs = 10,
                VerkoperID = "2"
            };
            dbContext.Producten.Add(testProduct);
            await dbContext.SaveChangesAsync();

            // Constructor update
            var controller = new ProductController(dbContext, productService, GetFakeEnvironment());

            // Act
            var result = await controller.UpdateProductPrice(1, 25);

            // Assert
            Assert.IsType<OkObjectResult>(result);

            var dbProduct = await dbContext.Producten.FindAsync(1);
            Assert.Equal(25, dbProduct.StartPrijs);
        }

        [Fact]
        public async Task Admin_UpdateProductPrice_Should_Return_NotFound_If_ID_Is_Wrong()
        {
            using var dbContext = GetInMemoryDbContext();
            ProductService productService = GetProductService();
            // Constructor update
            var controller = new ProductController(dbContext, productService, GetFakeEnvironment());

            var result = await controller.UpdateProductPrice(99, 50);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdateProductPrice_MetNegatievePrijs_GeeftBadRequest()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "TestDb_Negatief")
                .Options;

            using (var context = new AppDbContext(options))
            {
                context.Producten.Add(new Product
                {
                    ProductID = 1,
                    Naam = "Test Vaas",
                    StartPrijs = 50
                });
                await context.SaveChangesAsync();
            }

            using (var context = new AppDbContext(options))
            {
                var productService = new Services.ProductService(context);
                // Constructor update
                var controller = new ProductController(context, productService, new FakeWebHostEnvironment());

                var result = await controller.UpdateProductPrice(1, -10);

                Assert.IsType<BadRequestObjectResult>(result);

                var productInDb = await context.Producten.FindAsync(1);
                Assert.Equal(50, productInDb.StartPrijs);
            }
        }

        [Fact]
        public async Task UpdateProductPrice_MetGeldigePrijs_PastPrijsAan()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: "TestDb_Positief")
                .Options;

            using (var context = new AppDbContext(options))
            {
                context.Producten.Add(new Product
                {
                    ProductID = 1,
                    Naam = "Test Vaas",
                    StartPrijs = 50
                });
                await context.SaveChangesAsync();
            }

            using (var context = new AppDbContext(options))
            {
                // Constructor update
                var controller = new ProductController(context, new ProductService(context), new FakeWebHostEnvironment());

                var result = await controller.UpdateProductPrice(1, 75);

                Assert.IsType<OkObjectResult>(result);

                var productInDb = await context.Producten.FindAsync(1);
                Assert.Equal(75, productInDb.StartPrijs);
            }
        }
    }

    // --- FAKE CLASS VOOR IWebHostEnvironment ---
    // Dit zorgt ervoor dat we geen echte server nodig hebben om te testen
    public class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = "wwwroot";
        public string ContentRootPath { get; set; } = "./";
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "BackendTests";
        public IFileProvider WebRootFileProvider { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
    }
}