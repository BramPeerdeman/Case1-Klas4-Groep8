import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Nodig om naar de klok te gaan
import { 
  Container, Box, TextField, Button, Typography, Card, CardContent, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Chip
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import GavelIcon from '@mui/icons-material/Gavel';

// Interface voor de producten
interface Product {
  productID: number;
  naam: string;
  beschrijving: string;
  startPrijs: number;
  imageUrl?: string;
}

export default function VeilingMeesterPanel() {
  const navigate = useNavigate(); // Hook voor navigatie
  
  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  
  // Feedback state
  const [priceError, setPriceError] = useState<string>("");
  const [priceSuccess, setPriceSuccess] = useState<string>("");

  // --- OPHALEN PRODUCTEN ---
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

  useEffect(() => {
    fetchProducts();
  }, [priceSuccess]); // Herlaad lijst als update gelukt is

  // --- ACTIES ---

  // 1. Selecteer een product om te bewerken (vult het formulier)
  const handleSelectForEdit = (product: Product) => {
    setSelectedProduct(product);
    setNewPrice(product.startPrijs.toString());
    setPriceError("");
    setPriceSuccess("");
    // Scroll soepel naar boven
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Start de veiling (Navigeer naar de Klok pagina)
const handleStartAuction = async (id: number) => {
    try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
        
        // 1. Stuur POST naar de C# API
        const response = await fetch(`${baseUrl}/api/Auction/start/${id}`, { 
            method: 'POST' 
        });

        if (response.ok) {
            // 2. Open de klok in een nieuw tabblad om mee te kijken (optioneel)
            // window.open(`/klok/${id}`, '_blank');
        } else {
            console.error("Server weigerde de start.");
        }
        
    } catch (error) {
        console.error("Kon veiling niet starten. Is de backend online?", error);
    }
  };

  // 3. Update de prijs (API Call)
  const handleUpdatePrice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct) return;

    const token = localStorage.getItem("token");
    // Simpele check, in productie betere auth check doen
    // if (!token) { setPriceError("U bent niet ingelogd."); return; }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
      
      const response = await fetch(`${baseUrl}/api/Product/product/${selectedProduct.productID}/veranderprijs`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(Number(newPrice)), 
      });

      if (response.ok) {
        setPriceSuccess(`Prijs voor "${selectedProduct.naam}" aangepast naar €${newPrice}!`);
        setSelectedProduct(null); // Reset formulier
        setNewPrice("");
      } else {
         setPriceError("Aanpassen mislukt. Controleer connectie of rechten.");
      }
    } catch (err) {
      setPriceError("Server onbereikbaar.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
           Veilingmeester Dashboard
        </Typography>
        <Chip label={`${products.length} Kavels geladen`} color="default" />
      </Box>
      
      {/* --- DEEL 1: BEWERK FORMULIER (Alleen zichtbaar als je op 'bewerk' klikt) --- */}
      {selectedProduct && (
        <Card sx={{ mb: 4, border: '1px solid #1976d2', backgroundColor: '#e3f2fd' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Prijs aanpassen voor: <strong>{selectedProduct.naam}</strong>
            </Typography>
            
            <Box component="form" onSubmit={handleUpdatePrice} sx={{ display: "flex", gap: 2, alignItems: 'flex-start' }}>
              <TextField 
                label="Nieuwe Startprijs (€)" 
                type="number" 
                variant="outlined" 
                value={newPrice} 
                onChange={e => setNewPrice(e.target.value)} 
                required 
                sx={{ bgcolor: 'white' }}
              />
              <Button type="submit" variant="contained" color="primary" size="large" sx={{ height: 56 }}>
                Opslaan
              </Button>
              <Button variant="text" onClick={() => setSelectedProduct(null)} sx={{ height: 56 }}>
                Annuleren
              </Button>
            </Box>

            {priceError && <Typography color="error" sx={{ mt: 2 }}>{priceError}</Typography>}
          </CardContent>
        </Card>
      )}

      {priceSuccess && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#edf7ed', color: '#1e4620' }}>
            {priceSuccess}
        </Paper>
      )}

      {/* --- DEEL 2: DE TABEL --- */}
      <TableContainer component={Paper} elevation={3}>
        <Table aria-label="veiling tabel">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#263238' }}>
              <TableCell sx={{ color: 'white' }}>Foto</TableCell>
              <TableCell sx={{ color: 'white' }}>Product</TableCell>
              <TableCell sx={{ color: 'white' }}>Startprijs</TableCell>
              <TableCell sx={{ color: 'white' }} align="center">Acties</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow 
                key={product.productID} 
                hover 
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.naam} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} 
                    />
                  ) : (
                    <Box sx={{ width: 60, height: 60, bgcolor: '#eee', borderRadius: 2 }} />
                  )}
                </TableCell>
                <TableCell>
                    <Typography variant="subtitle1" fontWeight="bold">{product.naam}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: {product.productID}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="h6">€ {product.startPrijs}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" justifyContent="center" gap={2}>
                    
                    {/* KNOP 1: BEWERKEN */}
                    <Tooltip title="Prijs wijzigen">
                        <IconButton 
                            color="default" 
                            onClick={() => handleSelectForEdit(product)}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>

                    {/* KNOP 2: VEILING STARTEN (BELANGRIJKSTE) */}
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        startIcon={<GavelIcon />}
                        onClick={() => handleStartAuction(product.productID)}
                    >
                        Start Veiling
                    </Button>

                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} align="center">Geen producten gevonden.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};