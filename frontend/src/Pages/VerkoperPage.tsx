import { useState } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";
import { useNotification } from "../Contexts/NotificationContext";

// Interface voor het formulier
interface NewProductForm {
  naam: string;
  beschrijving: string;
  minPrijs: string; // String om leeg te kunnen beginnen
  imageUrl: string;
  locatie?: string;
  beginDatum?: string;
}

export default function VerkoperPage() {
  
  // State
  const [formData, setFormData] = useState<NewProductForm>({
    naam: "",
    beschrijving: "",
    minPrijs: "",
    imageUrl: "",
    locatie: "",
    beginDatum: ""
  });
  const { notify } = useNotification();

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

    const token = localStorage.getItem("token");
    if (!token) {
      notify("U bent niet ingelogd.", "error");
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
          minPrijs: Number(formData.minPrijs),
          imageUrl: formData.imageUrl,
          locatie: formData.locatie,
          beginDatum: formData.beginDatum
        }),
      });

      if (response.ok) {
        notify("Product succesvol toegevoegd!", "success");
        setFormData({ naam: "", beschrijving: "", minPrijs: "", imageUrl: "" });
      } else {
        notify("Toevoegen mislukt. Bent u wel een Veiler?", "error");
        console.error("Backend error:", await response.text());
      }
    } catch (err) {
      notify("Kan geen verbinding maken met de server.", "error");
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
              label="Minprijs (€)" 
              name="minPrijs"
              type="number" 
              variant="outlined" 
              value={formData.minPrijs} 
              onChange={handleChange} 
              required fullWidth 
            />



            <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
              Product Toevoegen
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};