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
        // OTHER PRODUCT TESTS (Optional, but good for context)
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
    }
}