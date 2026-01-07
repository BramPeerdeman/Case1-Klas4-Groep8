using Microsoft.EntityFrameworkCore;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore; 

namespace backend.Data
{
    public class AppDbContext : IdentityDbContext<Gebruiker>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        
        public DbSet<Product> Producten => Set<Product>();
        public DbSet<Veiling> Veilingen => Set<Veiling>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            
            base.OnModelCreating(modelBuilder); 

           

            
            modelBuilder.Entity<Gebruiker>().ToTable("Gebruikers");

            
            modelBuilder.Entity<Admin>().ToTable("Admins");
            modelBuilder.Entity<Veiler>().ToTable("Veilers");
            modelBuilder.Entity<Koper>().ToTable("Kopers");
        }
    }
}