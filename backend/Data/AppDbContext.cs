using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Gebruiker> Gebruikers => Set<Gebruiker>();
        public DbSet<Admin> Admins => Set<Admin>();
        public DbSet<Veiler> Veilers => Set<Veiler>();
        public DbSet<Koper> Kopers => Set<Koper>();
        public DbSet<Product> Producten => Set<Product>();
        public DbSet<Veiling> Veilingen => Set<Veiling>();
    }
}
