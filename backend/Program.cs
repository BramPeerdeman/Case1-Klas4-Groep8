using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

var builder = WebApplication.CreateBuilder(args);

// --- Database (SQL Server) ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:5173", "https://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
        });


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
    c.SchemaFilter<GebruikerExampleFilter>();
});

builder.Services.AddSignalR();
var app = builder.Build();

// --- Middleware ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
    });
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();
app.MapHub<AuctionHub>("/AuctionHub");
app.MapControllers();

app.Run();
