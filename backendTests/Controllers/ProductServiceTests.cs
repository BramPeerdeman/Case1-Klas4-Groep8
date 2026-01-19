using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace backendTests.Services
{
    public class ProductServiceTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetAuctionableProductsAsync_ShouldReturnsOnlyTodayAndEarlier()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var service = new ProductService(context);

            var today = DateTime.Today;

            // Product 1: Vandaag, geprijsd, veilbaar -> MOET TERUGKOMEN
            context.Producten.Add(new Product { Naam = "Vandaag", BeginDatum = today, StartPrijs = 10, IsAuctionable = true });

            // Product 2: Gisteren, geprijsd, veilbaar -> MOET TERUGKOMEN
            context.Producten.Add(new Product { Naam = "Gisteren", BeginDatum = today.AddDays(-1), StartPrijs = 10, IsAuctionable = true });

            // Product 3: Morgen -> MAG NIET (Scheduled)
            context.Producten.Add(new Product { Naam = "Morgen", BeginDatum = today.AddDays(1), StartPrijs = 10, IsAuctionable = true });

            // Product 4: Geen prijs -> MAG NIET
            context.Producten.Add(new Product { Naam = "GeenPrijs", BeginDatum = today, StartPrijs = null, IsAuctionable = true });

            // Product 5: Niet veilbaar -> MAG NIET
            context.Producten.Add(new Product { Naam = "NietVeilbaar", BeginDatum = today, StartPrijs = 10, IsAuctionable = false });

            await context.SaveChangesAsync();

            // Act
            var result = await service.GetAuctionableProductsAsync();

            // Assert
            Assert.Equal(2, result.Count);
            Assert.Contains(result, p => p.Naam == "Vandaag");
            Assert.Contains(result, p => p.Naam == "Gisteren");
        }

        [Fact]
        public async Task GetScheduledProductsAsync_ShouldReturnFutureProducts()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var service = new ProductService(context);
            var today = DateTime.Today;

            context.Producten.Add(new Product { Naam = "Morgen", BeginDatum = today.AddDays(1), StartPrijs = 10, IsAuctionable = true });
            context.Producten.Add(new Product { Naam = "Vandaag", BeginDatum = today, StartPrijs = 10, IsAuctionable = true });

            await context.SaveChangesAsync();

            // Act
            var result = await service.GetScheduledProductsAsync();

            // Assert
            Assert.Single(result);
            Assert.Equal("Morgen", result[0].Naam);
        }

        [Fact]
        public async Task ResetExpiredProductsAsync_ShouldResetUnsoldPastProducts()
        {
            // Arrange
            using var context = GetInMemoryDbContext();
            var service = new ProductService(context);
            var today = DateTime.Today;

            // Expired: Gisteren, niet verkocht -> MOET RESETTEN
            var p1 = new Product { ProductID = 1, Naam = "Verlopen", BeginDatum = today.AddDays(-1), IsAuctionable = true, StartPrijs = 100, KoperID = null };

            // Sold: Gisteren, maar verkocht -> MAG NIET RESETTEN
            var p2 = new Product { ProductID = 2, Naam = "Verkocht", BeginDatum = today.AddDays(-1), IsAuctionable = true, StartPrijs = 100, KoperID = "Klant1" };

            // Active: Vandaag -> MAG NIET RESETTEN
            var p3 = new Product { ProductID = 3, Naam = "Actief", BeginDatum = today, IsAuctionable = true, StartPrijs = 100, KoperID = null };

            context.Producten.AddRange(p1, p2, p3);
            await context.SaveChangesAsync();

            // Act
            await service.ResetExpiredProductsAsync();

            // Assert
            var dbP1 = await context.Producten.FindAsync(1);
            Assert.False(dbP1.IsAuctionable); // Reset
            Assert.Null(dbP1.StartPrijs);     // Reset

            var dbP2 = await context.Producten.FindAsync(2);
            Assert.True(dbP2.IsAuctionable);  // Was verkocht, blijf af

            var dbP3 = await context.Producten.FindAsync(3);
            Assert.True(dbP3.IsAuctionable);  // Is vandaag, blijf af
        }
    }
}