using backend.Data;
using backend.Hubs;
using backend.Models;
using backend.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

// --- Database (SQL Server) ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<Gebruiker, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };
});   

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => true) 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});

builder.Services.AddHostedService<PriceTickerService>();

// --- Controllers + Routing ---
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Zorg dat System.Text.Json polymorfie begrijpt
        options.JsonSerializerOptions.TypeInfoResolverChain.Insert(0,
            new DefaultJsonTypeInfoResolver
            {
                Modifiers =
                {
                    ti =>
                    {
                        if (ti.Type == typeof(Gebruiker))
                        {
                            ti.PolymorphismOptions = new JsonPolymorphismOptions
                            {
                                TypeDiscriminatorPropertyName = "type",
                                IgnoreUnrecognizedTypeDiscriminators = true,
                                UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FallBackToBaseType
                            };
                            ti.PolymorphismOptions.DerivedTypes.Add(new JsonDerivedType(typeof(Admin), "admin"));
                            ti.PolymorphismOptions.DerivedTypes.Add(new JsonDerivedType(typeof(Veiler), "veiler"));
                            ti.PolymorphismOptions.DerivedTypes.Add(new JsonDerivedType(typeof(Koper), "koper"));
                        }
                    }
                }
            });
    });

builder.Services.AddRouting();

// --- Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });
    c.SupportNonNullableReferenceTypes();
    c.UseAllOfToExtendReferenceSchemas();
    c.UseOneOfForPolymorphism(); // <-- belangrijk
    //c.SchemaFilter<GebruikerExampleFilter>();
});

builder.Services.AddSignalR();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
    try
    {
        // Vraag de RoleManager (de "Rollenbaas") op
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        string[] roleNames = { "admin", "koper", "veiler" };
        foreach (var roleName in roleNames)
        {
            // Bestaat de rol al?
            var roleExists = await roleManager.RoleExistsAsync(roleName);
            if (!roleExists)
            {
                // Nee? Maak hem dan aan.
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }
    }
    catch (Exception ex)
    {
        // Mocht het seeden falen (bv. database niet bereikbaar), log het dan
        var logger = loggerFactory.CreateLogger<Program>();
        logger.LogError(ex, "Er is een fout opgetreden bij het seeden van de rollen.");
    }
}

// --- Middleware ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
    });
}

//app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
app.UseAuthentication(); 
app.UseAuthorization();
app.MapHub<AuctionHub>("/AuctionHub");
app.MapControllers();

app.Run();
