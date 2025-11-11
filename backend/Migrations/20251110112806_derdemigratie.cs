using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class derdemigratie : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Producten_Veilers_VerkoperID",
                table: "Producten");

            migrationBuilder.DropForeignKey(
                name: "FK_Veilingen_Producten_ProductID",
                table: "Veilingen");

            migrationBuilder.DropIndex(
                name: "IX_Veilingen_ProductID",
                table: "Veilingen");

            migrationBuilder.DropIndex(
                name: "IX_Producten_VerkoperID",
                table: "Producten");

            migrationBuilder.DropColumn(
                name: "StartTijd",
                table: "Veilingen");

            migrationBuilder.RenameColumn(
                name: "VeilingDuur",
                table: "Veilingen",
                newName: "VerkoperID");

            migrationBuilder.RenameColumn(
                name: "Datum",
                table: "Veilingen",
                newName: "StartDatumTijd");

            migrationBuilder.AlterColumn<float>(
                name: "VerkoopPrijs",
                table: "Veilingen",
                type: "real",
                nullable: true,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "EindTijd",
                table: "Veilingen",
                type: "time",
                nullable: true,
                oldClrType: typeof(TimeSpan),
                oldType: "time");

            migrationBuilder.AlterColumn<float>(
                name: "StartPrijs",
                table: "Producten",
                type: "real",
                nullable: true,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AddColumn<float>(
                name: "Eindprijs",
                table: "Producten",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "MinPrijs",
                table: "Producten",
                type: "real",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VeilerGebruikersID",
                table: "Producten",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Producten_VeilerGebruikersID",
                table: "Producten",
                column: "VeilerGebruikersID");

            migrationBuilder.AddForeignKey(
                name: "FK_Producten_Veilers_VeilerGebruikersID",
                table: "Producten",
                column: "VeilerGebruikersID",
                principalTable: "Veilers",
                principalColumn: "GebruikersID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Producten_Veilers_VeilerGebruikersID",
                table: "Producten");

            migrationBuilder.DropIndex(
                name: "IX_Producten_VeilerGebruikersID",
                table: "Producten");

            migrationBuilder.DropColumn(
                name: "Eindprijs",
                table: "Producten");

            migrationBuilder.DropColumn(
                name: "MinPrijs",
                table: "Producten");

            migrationBuilder.DropColumn(
                name: "VeilerGebruikersID",
                table: "Producten");

            migrationBuilder.RenameColumn(
                name: "VerkoperID",
                table: "Veilingen",
                newName: "VeilingDuur");

            migrationBuilder.RenameColumn(
                name: "StartDatumTijd",
                table: "Veilingen",
                newName: "Datum");

            migrationBuilder.AlterColumn<float>(
                name: "VerkoopPrijs",
                table: "Veilingen",
                type: "real",
                nullable: false,
                defaultValue: 0f,
                oldClrType: typeof(float),
                oldType: "real",
                oldNullable: true);

            migrationBuilder.AlterColumn<TimeSpan>(
                name: "EindTijd",
                table: "Veilingen",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0),
                oldClrType: typeof(TimeSpan),
                oldType: "time",
                oldNullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "StartTijd",
                table: "Veilingen",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AlterColumn<float>(
                name: "StartPrijs",
                table: "Producten",
                type: "real",
                nullable: false,
                defaultValue: 0f,
                oldClrType: typeof(float),
                oldType: "real",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Veilingen_ProductID",
                table: "Veilingen",
                column: "ProductID");

            migrationBuilder.CreateIndex(
                name: "IX_Producten_VerkoperID",
                table: "Producten",
                column: "VerkoperID");

            migrationBuilder.AddForeignKey(
                name: "FK_Producten_Veilers_VerkoperID",
                table: "Producten",
                column: "VerkoperID",
                principalTable: "Veilers",
                principalColumn: "GebruikersID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Veilingen_Producten_ProductID",
                table: "Veilingen",
                column: "ProductID",
                principalTable: "Producten",
                principalColumn: "ProductID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
