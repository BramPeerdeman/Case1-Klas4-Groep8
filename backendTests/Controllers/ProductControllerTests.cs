using backend.Controllers;
using backend.Data;
using backend.DTOs;
using backend.interfaces;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace backend.Controllers.Tests
{
    public class ProductControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private ProductController SetupController(AppDbContext context, string userId = "user1")
        {
            var productService = new ProductService(context);
            var mockAuction = new Mock<IAuctionService>();
            var env = new FakeWebHostEnvironment();

            var controller = new ProductController(context, productService, mockAuction.Object, env);

            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userId), new Claim("sub", userId) };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = principal }
            };

            return controller;
        }

        [Fact]
        public async Task GetAllProducts_ReturnsOnlyAvailableProducts()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { Naam = "Beschikbaar", Aantal = 10, KoperID = null });
            context.Producten.Add(new Product { Naam = "Uitverkocht", Aantal = 0, KoperID = null });
            await context.SaveChangesAsync();

            var controller = SetupController(context);
            var result = await controller.GetAllProducts();
            var list = Assert.IsType<List<Product>>(Assert.IsType<OkObjectResult>(result).Value);

            Assert.Single(list);
            Assert.Equal("Beschikbaar", list[0].Naam);
        }

        [Fact]
        public async Task GetProductById_ReturnsProduct_Or_NotFound()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { ProductID = 99, Naam = "Test" });
            await context.SaveChangesAsync();
            var controller = SetupController(context);

            var found = await controller.GetProductById(99);
            Assert.IsType<OkObjectResult>(found);

            var missing = await controller.GetProductById(123);
            Assert.IsType<NotFoundObjectResult>(missing);
        }

        [Fact]
        public async Task CreateProduct_SavesToDatabase()
        {
            using var context = GetInMemoryDbContext();
            var controller = SetupController(context, "Verkoper1");
            var dto = new ProductCreateDto { Naam = "Nieuw", Aantal = 5, MinPrijs = 10 };

            var result = await controller.CreateProduct(dto);
            Assert.IsType<CreatedAtActionResult>(result);
            Assert.Equal(1, await context.Producten.CountAsync());
        }

        [Fact]
        public async Task DeleteProduct_Success_And_Fail()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { ProductID = 1, VerkoperID = "Me", IsAuctionable = false }); // Mag weg
            context.Producten.Add(new Product { ProductID = 2, VerkoperID = "Me", IsAuctionable = true });  // Mag NIET weg
            await context.SaveChangesAsync();

            var controller = SetupController(context, "Me");

            var res1 = await controller.DeleteProduct(1);
            Assert.IsType<OkObjectResult>(res1); // Gelukt

            var res2 = await controller.DeleteProduct(2);
            Assert.IsType<BadRequestObjectResult>(res2); // Mislukt (Live)
        }

        [Fact]
        public async Task UpdateProduct_Success()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { ProductID = 1, Naam = "Oud" });
            await context.SaveChangesAsync();

            var controller = SetupController(context);
            var res = await controller.UpdateProduct(1, new Product { Naam = "Nieuw" });
            Assert.IsType<OkObjectResult>(res);
            Assert.Equal("Nieuw", (await context.Producten.FindAsync(1)).Naam);
        }

        [Fact]
        public async Task GetMyProducts_ReturnsMixedList()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            string myId = "Veiler1";

            // 1. Actief Product (Voorraad) -> Komt in lijst 1
            context.Producten.Add(new Product { ProductID = 1, Naam = "Actief", VerkoperID = myId });

            // 2. Verkocht Product (Voorraad + Historie)
            // Dit product staat in de Producten tabel...
            context.Producten.Add(new Product { ProductID = 2, Naam = "VerkochtItem", VerkoperID = myId });
            // ...EN in de Veilingen tabel.
            context.Veilingen.Add(new Veiling { VeilingID = 100, ProductID = 2, VerkoperID = myId, VerkoopPrijs = 50, Aantal = 1, KoperId = "Klant" });

            await context.SaveChangesAsync();

            var controller = SetupController(context, myId);

            // Act
            var result = await controller.GetMyProducts();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsType<List<Product>>(okResult.Value);

            // FIX: Verwacht 3 items (Actief + VerkochtItem(Voorraad) + VerkochtItem(Historie))
            Assert.Equal(3, list.Count);

            // Check of ze erin zitten
            Assert.Contains(list, p => p.Naam == "Actief");
            Assert.Contains(list, p => p.Naam == "VerkochtItem");
        }

        [Fact]
        public async Task UpdateProductPrice_Works()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { ProductID = 1, StartPrijs = 10 });
            await context.SaveChangesAsync();
            var controller = SetupController(context);
            var res = await controller.UpdateProductPrice(1, 20);
            Assert.IsType<OkObjectResult>(res);
            Assert.Equal(20, (await context.Producten.FindAsync(1)).StartPrijs);
        }

        [Fact]
        public async Task StopSelling_Works()
        {
            using var context = GetInMemoryDbContext();
            context.Producten.Add(new Product { ProductID = 1, VerkoperID = "Me", IsAuctionable = true });
            await context.SaveChangesAsync();
            var controller = SetupController(context, "Me");

            var res = await controller.StopSelling(1);
            Assert.IsType<OkObjectResult>(res);
            Assert.False((await context.Producten.FindAsync(1)).IsAuctionable);
        }
    }

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