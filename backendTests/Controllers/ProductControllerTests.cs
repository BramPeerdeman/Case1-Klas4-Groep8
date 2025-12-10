using backend.Controllers;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Xunit;

namespace backend.Controllers.Tests
{
    public class ProductControllerTests
    {
        // Helper method to create a fresh In-Memory Database for each test
        // This simulates the database without needing a real SQL server
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique name per call
                .Options;
            return new AppDbContext(options);
        }

        // -------------------------------------------------------------------
        // VEILER SPECIFIC TESTS
        // -------------------------------------------------------------------

        [Fact]
        public void CreateProduct_ShouldBeRestrictedToVeilerRole()
        {
            // This test uses Reflection to check if you put the [Authorize] tag on the method.
            // This explicitly proves you satisfied the "Veiler only" requirement.

            // Arrange
            var methodInfo = typeof(ProductController).GetMethod(nameof(ProductController.CreateProduct));

            // Act
            var authorizeAttribute = methodInfo.GetCustomAttribute<AuthorizeAttribute>();

            // Assert
            Assert.NotNull(authorizeAttribute); // Must have [Authorize]
            Assert.Equal("veiler", authorizeAttribute.Roles); // Must be specifically for "veiler"
        }

        [Fact]
        public async Task CreateProduct_ReturnsCreatedAtAction_WhenProductIsValid()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var controller = new ProductController(context);

            var newProduct = new Product
            {
                Naam = "Veiling Item 1",
                Beschrijving = "Een prachtige antieke vaas",
                StartPrijs = 50,
                VerkoperID = 1 // Simulating the Veiler's ID
            };

            // Act
            var result = await controller.CreateProduct(newProduct);

            // Assert
            // 1. Check Response Type
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            var returnedProduct = Assert.IsType<Product>(createdResult.Value);

            // 2. Check Data Integrity
            Assert.Equal("Veiling Item 1", returnedProduct.Naam);

            // 3. Verify it was actually saved to the (In-Memory) Database
            Assert.Equal(1, await context.Producten.CountAsync());
        }

        [Fact]
        public async Task CreateProduct_ReturnsBadRequest_WhenModelIsInvalid()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var controller = new ProductController(context);

            // Manually trigger a validation error (Simulating missing required fields)
            controller.ModelState.AddModelError("Naam", "The Naam field is required.");

            var invalidProduct = new Product { Beschrijving = "Missing Name" };

            // Act
            var result = await controller.CreateProduct(invalidProduct);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        // -------------------------------------------------------------------
        // OTHER PRODUCT TESTS
        // -------------------------------------------------------------------

        [Fact]
        public async Task GetUnassignedProducts_ReturnsOnlyProductsWithoutStartPrijs()
        {
            // Arrange
            using var context = GetInMemoryDbContext();

            // Seed the database with mixed data
            context.Producten.Add(new Product { Naam = "Veilbaar", StartPrijs = 10 });
            context.Producten.Add(new Product { Naam = "Niet Veilbaar", StartPrijs = null });
            await context.SaveChangesAsync();

            var controller = new ProductController(context);

            // Act
            var result = await controller.GetUnassignedProducts();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var products = Assert.IsType<List<Product>>(okResult.Value);

            Assert.Single(products); // Should only find 1 product
            Assert.Equal("Niet Veilbaar", products[0].Naam);
        }

        [Fact]
        public async Task Admin_UpdateProductPrice_Should_Update_Price_In_Database()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var testProduct = new Product
            {
                ProductID = 1,
                Naam = "Test Bloem",
                StartPrijs = 10,
                VerkoperID = 2
            };
            dbContext.Producten.Add(testProduct);
            await dbContext.SaveChangesAsync();

            var controller = new ProductController(dbContext);

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

            // We maken een LEGE database (we voegen geen producten toe)
            using var dbContext = GetInMemoryDbContext();
            var controller = new ProductController(dbContext);


            // We proberen product met ID 99 te updaten (terwijl de database leeg is)
            var result = await controller.UpdateProductPrice(99, 50);


            // We verwachten dat de controller zegt: "NotFound" (404)
            Assert.IsType<NotFoundResult>(result);
        }
    }
}