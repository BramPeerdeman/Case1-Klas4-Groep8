import { useState } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent, Grid } from "@mui/material"; // Voeg 'Grid' toe


interface NewProductForm {
  naam: string;
  beschrijving: string;
  startPrijs: number;
}

export default function AdminPage() {
  
  const [formData, setFormData] = useState<NewProductForm>({
    naam: "",
    beschrijving: "",
    startPrijs: 0,
  });
  const [productError, setProductError] = useState<string>("");
  const [productSuccess, setProductSuccess] = useState<string>("");

  
  const [updateId, setUpdateId] = useState<string>(""); // Product ID om aan te passen
  const [newPrice, setNewPrice] = useState<number>(0);   // De nieuwe prijs
  const [priceError, setPriceError] = useState<string>("");
  const [priceSuccess, setPriceSuccess] = useState<string>("");

  // Helper-functie voor het "Nieuw Product" formulier
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // --- Functie voor het "Nieuw Product" formulier ---
  const handleAddProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setProductError("");
    setProductSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      setProductError("U bent niet ingelogd. Log opnieuw in.");
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
        setProductSuccess("Product succesvol toegevoegd!");
        setFormData({ naam: "", beschrijving: "", startPrijs: 0 });
      } else {
        setProductError("Toevoegen mislukt. Heeft u de juiste rechten?");
        console.error("Backend error:", await response.text());
      }
    } catch (err) {
      setProductError("Kan geen verbinding maken met de server.");
      console.error(err);
    }
  };

  // --- NIEUW: Functie voor het "Prijs Aanpassen" formulier ---
  const handleUpdatePrice = async (event: React.FormEvent) => {
    event.preventDefault();
    setPriceError("");
    setPriceSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      setPriceError("U bent niet ingelogd.");
      return;
    }

    try {
      // Gebruik het NIEUWE endpoint van je teamgenoot
      const response = await fetch(`http://localhost:5299/api/Product/product/${updateId}/veranderprijs`, {
        method: "PUT", // Je teamgenoot gebruikte [HttpPut]
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        // De backend verwacht alleen de prijs, dus we sturen alleen een getal
        body: JSON.stringify(Number(newPrice)), 
      });

      if (response.ok) {
        setPriceSuccess(`Prijs voor Product ID ${updateId} succesvol aangepast!`);
        setUpdateId("");
        setNewPrice(0);
      } else {
        const errorText = await response.text();
        if (response.status === 404) {
            setPriceError(`Product met ID ${updateId} niet gevonden.`);
        } else {
            setPriceError("Aanpassen mislukt. Heeft u de juiste rechten?");
            console.error("Backend error:", errorText);
        }
      }
    } catch (err) {
      setPriceError("Kan geen verbinding maken met de server.");
      console.error(err);
    }
  };


  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      
      {/* We gebruiken een Grid om de 2 formulieren naast elkaar te zetten */}
      <Grid container spacing={4}>
        
        {/* --- Kaart 1: Product Toevoegen (Bestaande code) --- */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>Nieuw Product Toevoegen</Typography>
              
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
                  label="Startprijs (€)" 
                  name="startPrijs"
                  type="number" 
                  variant="outlined" 
                  value={formData.startPrijs} 
                  onChange={handleChange} 
                  required fullWidth 
                />

                {productError && <Typography color="error" align="center">{productError}</Typography>}
                {productSuccess && <Typography color="primary" align="center">{productSuccess}</Typography>}

                <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                  Product Toevoegen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>Startprijs Aanpassen</Typography>
              
              <Box component="form" onSubmit={handleUpdatePrice} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField 
                  label="Product ID" 
                  name="updateId"
                  variant="outlined" 
                  value={updateId} 
                  onChange={e => setUpdateId(e.target.value)} 
                  required fullWidth 
                  helperText="Het ID van het product dat je wilt aanpassen."
                />
                <TextField 
                  label="Nieuwe Startprijs (€)" 
                  name="newPrice"
                  type="number" 
                  variant="outlined" 
                  value={newPrice} 
                  onChange={e => setNewPrice(Number(e.target.value))} 
                  required fullWidth 
                />

                {priceError && <Typography color="error" align="center">{priceError}</Typography>}
                {priceSuccess && <Typography color="primary" align="center">{priceSuccess}</Typography>}

                <Button type="submit" variant="contained" color="secondary" sx={{ mt: 2 }}>
                  Prijs Aanpassen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* TODO: Hier kan de "Veiling Starten" knop komen */}

      </Grid>
    </Container>
  );
};