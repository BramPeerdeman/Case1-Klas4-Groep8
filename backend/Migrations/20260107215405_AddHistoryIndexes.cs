using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddHistoryIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // STEP 1: Fix Producten.Naam
            // Change from nvarchar(max) to nvarchar(255) so it can be indexed.
            migrationBuilder.AlterColumn<string>(
                name: "Naam",
                table: "Producten",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            // STEP 2: Fix Veilingen.VerkoperID
            // Change from nvarchar(max) to nvarchar(450) so it can be indexed.
            // 450 is standard for Identity/User IDs.
            migrationBuilder.AlterColumn<string>(
                name: "VerkoperID",
                table: "Veilingen",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            // STEP 3: Create the indexes

            // Support filtering Producten by Naam
            migrationBuilder.CreateIndex(
                name: "IX_Producten_Naam",
                table: "Producten",
                column: "Naam");

            // Support filtering Veilingen by VerkoperID and sorting by StartDatumTijd
            migrationBuilder.CreateIndex(
                name: "IX_Veilingen_VerkoperID_StartDatumTijd",
                table: "Veilingen",
                columns: new[] { "VerkoperID", "StartDatumTijd" });

            // Support joining Veilingen and Producten on ProductID
            migrationBuilder.CreateIndex(
                name: "IX_Veilingen_ProductID",
                table: "Veilingen",
                column: "ProductID");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop indexes
            migrationBuilder.DropIndex(
                name: "IX_Producten_Naam",
                table: "Producten");

            migrationBuilder.DropIndex(
                name: "IX_Veilingen_VerkoperID_StartDatumTijd",
                table: "Veilingen");

            migrationBuilder.DropIndex(
                name: "IX_Veilingen_ProductID",
                table: "Veilingen");

            // Revert Veilingen.VerkoperID to nvarchar(max)
            migrationBuilder.AlterColumn<string>(
                name: "VerkoperID",
                table: "Veilingen",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldMaxLength: 450,
                oldNullable: true);

            // Revert Producten.Naam to nvarchar(max)
            migrationBuilder.AlterColumn<string>(
                name: "Naam",
                table: "Producten",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);
        }
    }
}