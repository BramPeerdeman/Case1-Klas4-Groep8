using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Gebruikers",
                columns: table => new
                {
                    GebruikersID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Gebruikersnaam = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Wachtwoord = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Voornaam = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Achternaam = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UiSettings = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gebruikers", x => x.GebruikersID);
                });

            migrationBuilder.CreateTable(
                name: "Admins",
                columns: table => new
                {
                    GebruikersID = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Admins", x => x.GebruikersID);
                    table.ForeignKey(
                        name: "FK_Admins_Gebruikers_GebruikersID",
                        column: x => x.GebruikersID,
                        principalTable: "Gebruikers",
                        principalColumn: "GebruikersID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Kopers",
                columns: table => new
                {
                    GebruikersID = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kopers", x => x.GebruikersID);
                    table.ForeignKey(
                        name: "FK_Kopers_Gebruikers_GebruikersID",
                        column: x => x.GebruikersID,
                        principalTable: "Gebruikers",
                        principalColumn: "GebruikersID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Veilers",
                columns: table => new
                {
                    GebruikersID = table.Column<int>(type: "int", nullable: false),
                    KvkNummer = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Veilers", x => x.GebruikersID);
                    table.ForeignKey(
                        name: "FK_Veilers_Gebruikers_GebruikersID",
                        column: x => x.GebruikersID,
                        principalTable: "Gebruikers",
                        principalColumn: "GebruikersID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Producten",
                columns: table => new
                {
                    ProductID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Naam = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Beschrijving = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartPrijs = table.Column<float>(type: "real", nullable: false),
                    VerkoperID = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Producten", x => x.ProductID);
                    table.ForeignKey(
                        name: "FK_Producten_Veilers_VerkoperID",
                        column: x => x.VerkoperID,
                        principalTable: "Veilers",
                        principalColumn: "GebruikersID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Veilingen",
                columns: table => new
                {
                    VeilingID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VerkoopPrijs = table.Column<float>(type: "real", nullable: false),
                    Datum = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartTijd = table.Column<TimeSpan>(type: "time", nullable: false),
                    VeilingDuur = table.Column<int>(type: "int", nullable: false),
                    EindTijd = table.Column<TimeSpan>(type: "time", nullable: false),
                    ProductID = table.Column<int>(type: "int", nullable: false),
                    KoperID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Veilingen", x => x.VeilingID);
                    table.ForeignKey(
                        name: "FK_Veilingen_Kopers_KoperID",
                        column: x => x.KoperID,
                        principalTable: "Kopers",
                        principalColumn: "GebruikersID");
                    table.ForeignKey(
                        name: "FK_Veilingen_Producten_ProductID",
                        column: x => x.ProductID,
                        principalTable: "Producten",
                        principalColumn: "ProductID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Producten_VerkoperID",
                table: "Producten",
                column: "VerkoperID");

            migrationBuilder.CreateIndex(
                name: "IX_Veilingen_KoperID",
                table: "Veilingen",
                column: "KoperID");

            migrationBuilder.CreateIndex(
                name: "IX_Veilingen_ProductID",
                table: "Veilingen",
                column: "ProductID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Admins");

            migrationBuilder.DropTable(
                name: "Veilingen");

            migrationBuilder.DropTable(
                name: "Kopers");

            migrationBuilder.DropTable(
                name: "Producten");

            migrationBuilder.DropTable(
                name: "Veilers");

            migrationBuilder.DropTable(
                name: "Gebruikers");
        }
    }
}
