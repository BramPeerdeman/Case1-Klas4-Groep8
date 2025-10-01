using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Admin> Admins => Set<Admin>();
        public DbSet<Veiler> Veilers => Set<Veiler>();
        public DbSet<Koper> Kopers => Set<Koper>();
        public DbSet<Product> Producten => Set<Product>();
        public DbSet<Veiling> Veilingen => Set<Veiling>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Tell EF Core the key is GebruikersID for all derived classes
            modelBuilder.Entity<Admin>().HasKey(a => a.GebruikersID);
            modelBuilder.Entity<Veiler>().HasKey(v => v.GebruikersID);
            modelBuilder.Entity<Koper>().HasKey(k => k.GebruikersID);

            base.OnModelCreating(modelBuilder);
        }
    }
}