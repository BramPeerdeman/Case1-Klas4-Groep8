using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Eén DbSet voor alle gebruikers
        public DbSet<Gebruiker> Gebruikers => Set<Gebruiker>();
        public DbSet<Product> Producten => Set<Product>();
        public DbSet<Veiling> Veilingen => Set<Veiling>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Basis entiteit configureren
            modelBuilder.Entity<Gebruiker>(entity =>
            {
                entity.HasKey(g => g.GebruikersID);
                entity.ToTable("Gebruikers");
            });

            // Subtypes krijgen hun eigen tabellen met alleen hun extra velden
            modelBuilder.Entity<Admin>().ToTable("Admins");
            modelBuilder.Entity<Veiler>().ToTable("Veilers");
            modelBuilder.Entity<Koper>().ToTable("Kopers");

            base.OnModelCreating(modelBuilder);
        }
    }

}