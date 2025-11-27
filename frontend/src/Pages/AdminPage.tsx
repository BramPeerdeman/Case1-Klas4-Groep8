import { useState, useEffect } from "react";
import { 
  Container, Box, TextField, Button, Typography, Card, CardContent, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Chip, Snackbar, Alert 
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import GavelIcon from '@mui/icons-material/Gavel';

// Importeer jouw geupdate data file
import { fetchProducts, type Product } from "../Data/Products";

export default function VeilingMeesterPanel() {
  // Gebruik jouw hook
  const { products: fetchedProducts } = fetchProducts();
  const [products, setProducts] = useState<Product[]>([]);

  // Sync state zodra data geladen is
  useEffect(() => { setProducts(fetchedProducts); }, [fetchedProducts]);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  
  // Feedback state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  // ACTIE: Start Veiling
  const handleStartAuction = async (id: number) => {
    try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
        const response = await fetch(`${baseUrl}/api/Auction/start/${id}`, { method: 'POST' });

        if (response.ok) {
            setSnackbarMsg(`Veiling voor product ${id} is gestart!`);
            setSnackbarOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } 
    } catch (error) { console.error("Start failed", error); }
  };

  // ACTIE: Selecteer voor bewerken
  const handleSelectForEdit = (product: Product) => {
    setSelectedProduct(product);
    setNewPrice(product.startPrijs.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ACTIE: Prijs Updaten
  const handleUpdatePrice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct) return;
    
    // ... Jouw bestaande update logica hier ...
    // Let op: gebruik selectedProduct.productID (niet .id)
    alert("Prijs update functie hier invoegen (zoals in vorige stap)");
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4" color="primary">Veilingmeester Dashboard</Typography>
        <Chip label={`${products.length} Kavels`} />
      </Box>
      
      {/* Formulier */}
      {selectedProduct && (
        <Card sx={{ mb: 4, bgcolor: '#e3f2fd' }}>
          <CardContent>
            <Typography variant="h6">Prijs aanpassen: <strong>{selectedProduct.naam}</strong></Typography>
            <Box component="form" onSubmit={handleUpdatePrice} sx={{ display: "flex", gap: 2, mt: 2 }}>
              <TextField label="Prijs" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} sx={{ bgcolor: 'white' }} />
              <Button type="submit" variant="contained">Opslaan</Button>
              <Button onClick={() => setSelectedProduct(null)}>Annuleren</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabel */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#263238' }}>
              <TableCell sx={{ color: 'white' }}>Foto</TableCell>
              <TableCell sx={{ color: 'white' }}>Product</TableCell>
              <TableCell sx={{ color: 'white' }}>Startprijs</TableCell>
              <TableCell sx={{ color: 'white' }} align="center">Acties</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.productID} hover>
                <TableCell><img src={p.imageUrl} style={{width: 50, borderRadius: 4}} /></TableCell>
                <TableCell>{p.naam}</TableCell>
                <TableCell>€ {p.startPrijs}</TableCell>
                <TableCell align="center">
                    <IconButton onClick={() => handleSelectForEdit(p)}><EditIcon /></IconButton>
                    <Button 
                        variant="contained" color="secondary" size="small" startIcon={<GavelIcon />}
                        onClick={() => handleStartAuction(p.productID)} sx={{ ml: 2 }}
                    >
                        Start
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirmatie Melding */}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>{snackbarMsg}</Alert>
      </Snackbar>
    </Container>
  );
};