using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class LoginDbContext : DbContext 
    {
        public LoginDbContext(DbContextOptions<LoginDbContext> options) : base(options){ }
        public DbSet<LoginCred> LoginCreds => Set<LoginCred>();
        protected LoginDbContext()
        {

        }

        
    }


}