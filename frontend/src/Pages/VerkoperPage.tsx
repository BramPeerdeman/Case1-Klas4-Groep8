import { useState } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";

// Interface voor het formulier
interface NewProductForm {
  naam: string;
  beschrijving: string;
  startPrijs: string; // String om leeg te kunnen beginnen
  imageUrl: string;
  locatie?: string;
  beginDatum?: string;
}

export default function VerkoperPage() {
  
  // State
  const [formData, setFormData] = useState<NewProductForm>({
    naam: "",
    beschrijving: "",
    startPrijs: "",
    imageUrl: "",
    locatie: "",
    beginDatum: ""
  });
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Helper
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Submit functie
  const handleAddProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("U bent niet ingelogd.");
      return;
    }

    try {
      // Gebruik de .env variabele of fallback
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
      
      const response = await fetch(`${baseUrl}/api/Product/product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          naam: formData.naam,
          beschrijving: formData.beschrijving,
          startPrijs: Number(formData.startPrijs),
          imageUrl: formData.imageUrl,
          locatie: formData.locatie,
          beginDatum: formData.beginDatum
        }),
      });

      if (response.ok) {
        setSuccess("Product succesvol toegevoegd!");
        setFormData({ naam: "", beschrijving: "", startPrijs: "", imageUrl: "" });
      } else {
        setError("Toevoegen mislukt. Bent u wel een Veiler?");
        console.error("Backend error:", await response.text());
      }
    } catch (err) {
      setError("Kan geen verbinding maken met de server.");
      console.error(err);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Verkoper Dashboard</Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Nieuw Product Aanbieden</Typography>
          
          <Box component="form" onSubmit={handleAddProduct} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField 
              label="Productnaam" 
              name="naam"
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
              label="Locatie" 
              name="locatie"
              variant="outlined" 
              value={formData.locatie} 
              onChange={handleChange} 
              fullWidth 
              placeholder="Bijv. Amsterdam"
            />

            <TextField
              label="Startdatum Veiling"
              type="datetime-local"
              name="beginDatum"
              value={formData.beginDatum}
              onChange={handleChange}
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            
            <TextField 
              label="Afbeelding URL" 
              name="imageUrl"
              variant="outlined" 
              value={formData.imageUrl} 
              onChange={handleChange} 
              fullWidth 
              placeholder="https://voorbeeld.nl/bloem.jpg"
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