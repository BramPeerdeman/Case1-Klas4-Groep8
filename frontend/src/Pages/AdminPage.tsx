import { useState } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";

// DTO (data-pakketje) voor ons formulier
interface NewProductForm {
  naam: string;
  beschrijving: string;
  startPrijs: number;
  // TODO: Voeg hier meer velden toe als je backend die verwacht
  // bijv: fotoUrl: string;
  // bijv: verkoperId: string; (Als de admin dit handmatig moet invullen)
}

export default function AdminPage() {
  // States voor ons nieuwe productformulier
  const [formData, setFormData] = useState<NewProductForm>({
    naam: "",
    beschrijving: "",
    startPrijs: 0,
  });
  
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Een helper-functie om het formulier bij te werken
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // 1. HAAL HET "PASPOORT" (TOKEN) UIT DE OPSLAG
    const token = localStorage.getItem("token");
    if (!token) {
      setError("U bent niet ingelogd. Log opnieuw in.");
      return;
    }

    try {
      
      const response = await fetch("http://localhost:5299/api/Product/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
          
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          naam: formData.naam,
          beschrijving: formData.beschrijving,
          startPrijs: Number(formData.startPrijs), 
        }),
      });

      if (response.ok) {
        
        setSuccess("Product succesvol toegevoegd!");
        // Reset het formulier
        setFormData({ naam: "", beschrijving: "", startPrijs: 0 });
      } else {
        // FOUT: De backend weigerde het.
        setError("Toevoegen mislukt. Heeft u de juiste rechten? (Controleer de console voor details)");
        console.error("Backend error:", await response.text());
      }
    } catch (err) {
      // FOUT: Netwerkfout
      setError("Kan geen verbinding maken met de server.");
      console.error(err);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Nieuw Product Toevoegen</Typography>
          
          <Box component="form" onSubmit={handleAddProduct} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField 
              label="Productnaam" 
              name="naam" // 'name' moet matchen met de state
              variant="outlined" 
              value={formData.naam} 
              onChange={handleChange} 
              required fullWidth 
            />
            <TextField 
              label="Beschrijving" 
              name="beschrijving"
              variant="outlined" 
              value={formData.beschrijving} 
              onChange={handleChange} 
              multiline rows={3} 
              required fullWidth 
            />
            <TextField 
              label="Startprijs (€)" 
              name="startPrijs"
              type="number" 
              variant="outlined" 
              value={formData.startPrijs} 
              onChange={handleChange} 
              required fullWidth 
            />

            {/* Toon Fout- of Succesmeldingen */}
            {error && <Typography color="error" align="center">{error}</Typography>}
            {success && <Typography color="primary" align="center">{success}</Typography>}

            <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
              Product Toevoegen
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      
      
    </Container>
  );
};