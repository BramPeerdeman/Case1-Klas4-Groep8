import { useState, useEffect, type ChangeEvent } from "react";
import { 
  Container, Box, Button, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Checkbox, TextField, InputAdornment, Divider, Chip, Tooltip
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import InfoIcon from '@mui/icons-material/Info';
import { useNotification } from "../Contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

interface Product {
  productID: number;
  naam: string;
  minPrijs: number;
  startPrijs?: number;
  imageUrl: string;
  beschrijving: string;
  beginDatum?: string; // Added field
}

export default function AdminPage() {
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [veilbareProducts, setVeilbareProducts] = useState<Product[]>([]);
  
  const [inputPrijzen, setInputPrijzen] = useState<{ [key: number]: string }>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // FIX: Store active queue IDs to filter them out of the list
  const [activeQueueIds, setActiveQueueIds] = useState<number[]>([]);

  const { notify } = useNotification();
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // Format today's date for display
  const todayDate = new Date().toLocaleDateString('nl-NL');

  // Helper to check if a date string is today
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.setHours(0,0,0,0) === today.setHours(0,0,0,0);
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    try {
      // 1. Nieuwe producten
      const resNew = await fetch(`${baseUrl}/api/Product/product/onveilbarelist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resNew.ok) setNewProducts(await resNew.json());
      else setNewProducts([]);

      // 2. Fetch Queue IDs (Active Queue)
      let queueIds: number[] = [];
      try {
          const resQueue = await fetch(`${baseUrl}/api/Veiling/queue/ids`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resQueue.ok) {
              queueIds = await resQueue.json();
              setActiveQueueIds(queueIds);
          }
      } catch (e) {
          console.error("Failed to fetch queue ids", e);
      }

      // 3. Veilbare producten
      const resVeilbaar = await fetch(`${baseUrl}/api/Product/product/veilbarelijst`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resVeilbaar.ok) {
          const allProducts = await resVeilbaar.json();
          // FILTER: Only show products NOT currently in the active queue
          const filtered = allProducts.filter((p: Product) => !queueIds.includes(p.productID));
          setVeilbareProducts(filtered);
      } else {
          setVeilbareProducts([]);
      }

    } catch (error) {
      console.error("Fout bij ophalen data:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handlePriceChange = (id: number, value: string) => {
    setInputPrijzen(prev => ({ ...prev, [id]: value }));
  };

  const handleActivateProduct = async (product: Product) => {
    const prijs = inputPrijzen[product.productID];
    if (!prijs || Number(prijs) <= 0) {
      notify("Voer een geldige prijs in.", "error");
      return;
    }

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl}/api/Product/product/${product.productID}/veranderprijs`, {
          method: 'PUT',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(Number(prijs))
        });
        
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || "Fout bij activeren");
        }

        notify("Product geactiveerd!", "success");
        
        const newInputs = { ...inputPrijzen };
        delete newInputs[product.productID];
        setInputPrijzen(newInputs);
        fetchAllData();

    } catch (e: any) {
        notify(e.message || "Fout bij activeren.", "error");
    }
  };

  // --- UPDATED: REMOVE FROM QUEUE & DB ---
  const handleRemoveFromQueue = async (product: Product) => {
    if(!confirm(`Weet je zeker dat je ${product.naam} uit de lijst wilt halen?`)) return;

    try {
        const token = localStorage.getItem("token");

        // 1. Reset Price in Database (Moves it back to 'New Products')
        await fetch(`${baseUrl}/api/Product/product/${product.productID}/veranderprijs`, {
          method: 'PUT',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(0) 
        });

        // 2. Remove from Active Queue in Backend (if it's there)
        await fetch(`${baseUrl}/api/Veiling/queue/remove/${product.productID}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        notify("Product verwijderd uit veilbare lijst.", "info");
        fetchAllData(); 

    } catch (e) {
        console.error(e);
        notify("Fout bij verwijderen.", "error");
    }
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(veilbareProducts.map(p => p.productID));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleStartQueue = async () => {
    try {
        const token = localStorage.getItem("token");
        
        // 1. Add selected IDs to queue
        await fetch(`${baseUrl}/api/Veiling/queue/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(selectedIds)
        });

        // 2. Start Queue
        await fetch(`${baseUrl}/api/Veiling/queue/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        notify("Queue gestart! U wordt doorgestuurd...", "success", "top-center");
        setSelectedIds([]);
        
        setTimeout(() => {
            navigate('/VeilingmeesterLive'); 
        }, 1500);

    } catch (e) { 
        console.error(e);
        notify("Kon de queue niet starten.", "error");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Typography variant="h4">Veilingmeester Dashboard</Typography>
        <Box display="flex" gap={2}>
            <Button 
                variant="outlined" 
                color="info" 
                startIcon={<MonitorHeartIcon />}
                onClick={() => navigate('/VeilingmeesterLive')}
            >
                Ga naar Live Scherm
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={fetchAllData}>Verversen</Button>
        </Box>
      </Box>
      
      {/* --- TABLE 1: NEW PRODUCTS --- */}
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#fff8e1' }}>
        <Typography variant="h6" gutterBottom color="orange">
            Nieuwe Aanmeldingen (Bepaal Startprijs)
        </Typography>
        
        {newProducts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Geen nieuwe aanmeldingen.</Typography>
        ) : (
            <TableContainer component={Paper} elevation={0}>
            <Table size="small">
                <TableHead>
                <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell>Min. Prijs</TableCell>
                    <TableCell width={200}>Startprijs (€)</TableCell>
                    <TableCell>Actie</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {newProducts.map((p) => {
                    const activeAllowed = isToday(p.beginDatum);
                    const datumText = p.beginDatum ? new Date(p.beginDatum).toLocaleDateString('nl-NL') : 'Onbekend';

                    return (
                        <TableRow key={p.productID} sx={{ opacity: activeAllowed ? 1 : 0.6 }}>
                        <TableCell>
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                {p.imageUrl && <img src={p.imageUrl} width={40} height={40} style={{borderRadius: 4, objectFit: 'cover'}} />}
                                {p.naam}
                            </Box>
                        </TableCell>
                        <TableCell>
                            <Chip 
                                label={datumText} 
                                size="small" 
                                color={activeAllowed ? "success" : "default"} 
                                variant={activeAllowed ? "filled" : "outlined"}
                            />
                            {!activeAllowed && (
                                <Tooltip title={`Dit product is gepland voor ${datumText}, niet vandaag.`}>
                                    <InfoIcon fontSize="small" color="disabled" sx={{ ml: 1, verticalAlign: 'middle' }} />
                                </Tooltip>
                            )}
                        </TableCell>
                        <TableCell>€ {p.minPrijs}</TableCell>
                        <TableCell>
                            <TextField
                                size="small"
                                type="number"
                                placeholder="0.00"
                                disabled={!activeAllowed}
                                value={inputPrijzen[p.productID] || ""}
                                onChange={(e) => handlePriceChange(p.productID, e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
                            />
                        </TableCell>
                        <TableCell>
                            <Button 
                                variant="contained" size="small" startIcon={<SaveIcon />}
                                onClick={() => handleActivateProduct(p)}
                                disabled={!inputPrijzen[p.productID] || !activeAllowed}
                            >
                                Activeer
                            </Button>
                        </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            </TableContainer>
        )}
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* --- TABLE 2: AUCTIONABLE PRODUCTS --- */}
      <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" color="green">
                ✅ 2. Klaar voor Veiling ({todayDate})
            </Typography>
            <Button 
                variant="contained" color="success" size="large" startIcon={<PlayArrowIcon />}
                disabled={selectedIds.length === 0} 
                onClick={handleStartQueue}
            >
                Start Veiling ({selectedIds.length})
            </Button>
        </Box>

        {veilbareProducts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
                Geen producten gevonden voor de veiling van vandaag ({todayDate}) of alle producten zitten al in de queue.
            </Typography>
        ) : (
            <TableContainer component={Paper} elevation={0}>
            <Table>
                <TableHead>
                <TableRow>
                    <TableCell padding="checkbox">
                        <Checkbox 
                            onChange={handleSelectAll} 
                            checked={veilbareProducts.length > 0 && selectedIds.length === veilbareProducts.length} 
                        />
                    </TableCell>
                    <TableCell>Foto</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Startprijs</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actie</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {veilbareProducts.map((p) => (
                    <TableRow key={p.productID} hover selected={selectedIds.includes(p.productID)}>
                    <TableCell padding="checkbox">
                        <Checkbox 
                            checked={selectedIds.includes(p.productID)} 
                            onChange={() => handleSelectOne(p.productID)} 
                        />
                    </TableCell>
                    <TableCell>
                        {p.imageUrl && <img src={p.imageUrl} width={50} style={{borderRadius: 4}} alt={p.naam}/>}
                    </TableCell>
                    <TableCell>{p.naam}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>€ {p.startPrijs}</TableCell>
                    <TableCell><Chip label="Klaar" color="success" size="small" /></TableCell>
                    <TableCell>
                        <Button 
                            color="error" 
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleRemoveFromQueue(p)}
                        >
                            Verwijder
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        )}
      </Paper>
    </Container>
  );
}