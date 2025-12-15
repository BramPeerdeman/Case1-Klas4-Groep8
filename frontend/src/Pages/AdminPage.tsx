import { useState, useEffect, type ChangeEvent } from "react";
import { 
  Container, Box, Button, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Checkbox 
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'; // Icon for Live View
import { fetchProducts, type Product } from "../Data/Products";
import { useNotification } from "../Contexts/NotificationContext";
import { useNavigate } from "react-router-dom"; // Import Navigation

export default function AdminPage() {
  const { products: fetchedProducts } = fetchProducts();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const { notify } = useNotification();
  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => { setProducts(fetchedProducts); }, [fetchedProducts]);

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedIds(products.map(p => p.id));
    } else {
        setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
        setSelectedIds([...selectedIds, id]);
    }
  };

  const handleStartQueue = async () => {
    try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

        await fetch(`${baseUrl}/api/Veiling/queue/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(selectedIds)
        });

        await fetch(`${baseUrl}/api/Veiling/queue/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 1. Notify Success
        notify("Queue gestart! U wordt doorgestuurd...", "success", "top-center");
        setSelectedIds([]);
        
        // 2. Automatically navigate to the Live Screen after 1.5 seconds
        setTimeout(() => {
            navigate('/VeilingmeesterLive'); 
        }, 1500);

    } catch (e) { 
        console.error(e);
        notify("Er ging iets mis bij het starten.", "error");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Veilingmeester Dashboard</Typography>
        
        <Box display="flex" gap={2}>
            {/* Manual Navigation Button (in case they leave the page and want to go back) */}
            <Button 
                variant="outlined" 
                color="info" 
                startIcon={<MonitorHeartIcon />}
                onClick={() => navigate('/VeilingmeesterLive')}
            >
                Ga naar Live Scherm
            </Button>

            <Button 
                variant="contained" 
                color="success" 
                size="large" 
                startIcon={<PlayArrowIcon />}
                disabled={selectedIds.length === 0} 
                onClick={handleStartQueue}
            >
                Start Queue ({selectedIds.length})
            </Button>
        </Box>
      </Box>

      {/* ... Table Code remains exactly the same ... */}
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
    </Container>
  );
}