import { useState, useEffect } from "react";
import { 
  Container, Box, TextField, Button, Typography, Card, CardContent, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper 
} from "@mui/material";

// Interface voor de producten in de tabel
interface Product {
  productID: number;
  naam: string;
  beschrijving: string;
  startPrijs: number;
  imageUrl?: string;
}

export default function AdminPage() {
  
  // --- STATE VOOR PRIJS AANPASSEN ---
  const [updateId, setUpdateId] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [priceError, setPriceError] = useState<string>("");
  const [priceSuccess, setPriceSuccess] = useState<string>("");

  
  const [products, setProducts] = useState<Product[]>([]);

  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
        const response = await fetch(`${baseUrl}/api/Product/products`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Kon producten niet laden:", error);
      }
    };

    fetchProducts();
  }, [priceSuccess]); // Herlaad de lijst als er een prijs is aangepast!

  // --- PRIJS AANPASSEN ---
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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
      
      const response = await fetch(`${baseUrl}/api/Product/product/${updateId}/veranderprijs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(Number(newPrice)), 
      });

      if (response.ok) {
        setPriceSuccess(`Prijs voor Product ID ${updateId} succesvol aangepast!`);
        setUpdateId("");
        setNewPrice("");
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
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Veilingmeester Dashboard</Typography>
      
      {/* --- DEEL 1: HET FORMULIER --- */}
      <Card sx={{ mb: 6 }}>
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
              helperText="Kijk in de tabel hieronder voor het ID."
            />
            <TextField 
              label="Nieuwe Startprijs (€)" 
              name="newPrice"
              type="number" 
              variant="outlined" 
              value={newPrice} 
              onChange={e => setNewPrice(e.target.value)} 
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

      {/* --- DEEL 2: DE TABEL --- */}
      <Typography variant="h5" gutterBottom>Alle Producten</Typography>
      <TableContainer component={Paper}>
        <Table aria-label="product tabel">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Afbeelding</strong></TableCell>
              <TableCell><strong>Naam</strong></TableCell>
              <TableCell><strong>Startprijs</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.productID}>
                <TableCell>{product.productID}</TableCell>
                <TableCell>
                  {product.imageUrl && (
                    <img 
                      src={product.imageUrl} 
                      alt={product.naam} 
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
                    />
                  )}
                </TableCell>
                <TableCell>{product.naam}</TableCell>
                <TableCell>€ {product.startPrijs}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

    </Container>
  );
};