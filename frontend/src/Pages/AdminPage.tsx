import { useState, useEffect } from "react";
import { 
  Container, Box, Button, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Checkbox, Snackbar, Alert 
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
// We importeren het type 'Product' dat { id, name, price } gebruikt
import { fetchProducts, type Product } from "../Data/Products";

export default function AdminPage() {
  const { products: fetchedProducts } = fetchProducts();
  const [products, setProducts] = useState<Product[]>([]);
  
  // Selectie state (deze miste waarschijnlijk in je vorige versie)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { setProducts(fetchedProducts); }, [fetchedProducts]);

  // Checkbox Logica: Alles selecteren
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedIds(products.map(p => p.id));
    } else {
        setSelectedIds([]);
    }
  };

  // Checkbox Logica: Eén selecteren
  const handleSelectOne = (id: number) => {
    // Hier zat de typfout ('includ' -> 'includes')
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
        setSelectedIds([...selectedIds, id]);
    }
  };

  // Start Queue Actie
  const handleStartQueue = async () => {
    try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

        // 1. Stuur selectie naar backend
        await fetch(`${baseUrl}/api/Veiling/queue/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(selectedIds)
        });

        // 2. Druk op "Play"
        await fetch(`${baseUrl}/api/Veiling/queue/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        setMsg("Queue gestart! Ga naar het Klok scherm.");
        setSelectedIds([]);
    } catch (e) { 
        console.error(e);
        setMsg("Er ging iets mis bij het starten.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Veilingmeester Dashboard</Typography>
        <Button 
            variant="contained" color="success" size="large" startIcon={<PlayArrowIcon />}
            disabled={selectedIds.length === 0} onClick={handleStartQueue}
        >
            Start Queue ({selectedIds.length})
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#eee' }}>
              <TableCell padding="checkbox">
                <Checkbox 
                  onChange={handleSelectAll} 
                  checked={products.length > 0 && selectedIds.length === products.length} 
                />
              </TableCell>
              <TableCell>Foto</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Startprijs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} hover selected={selectedIds.includes(p.id)}>
                <TableCell padding="checkbox">
                    <Checkbox 
                      checked={selectedIds.includes(p.id)} 
                      onChange={() => handleSelectOne(p.id)} 
                    />
                </TableCell>
                <TableCell>
                    {p.imageUrl && (
                        <img src={p.imageUrl} width={50} style={{borderRadius: 4}} alt={p.name}/>
                    )}
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>€ {p.price}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Snackbar open={!!msg} autoHideDuration={4000} onClose={() => setMsg("")}>
        <Alert severity="success">{msg}</Alert>
      </Snackbar>
    </Container>
  );
}