import { useEffect, useState, useRef } from "react";
import { Container, Typography, Grid, Button, Box, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, Badge } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProductCard from "../Components/ProductCard";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useNotification } from "../Contexts/NotificationContext";
import * as signalR from "@microsoft/signalr";
import { usePageTitle } from "../Hooks/usePageTitle";

interface Product {
  productID: number;
  naam: string;
  minPrijs: number;
  imageUrl: string;
  beschrijving: string;
  aantal: number;
  beginDatum: string;
  isAuctionable: boolean;
  koperID?: string; 
}

export default function MyProducts() {
  usePageTitle("Mijn Producten");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tabs State
  const [currentTab, setCurrentTab] = useState(0);
  
  // Edit State
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
      naam: "",
      beschrijving: "",
      minPrijs: 0,
      aantal: 0,
      beginDatum: ""
  });
  const [openDialog, setOpenDialog] = useState(false);

  const navigate = useNavigate();
  const { notify } = useNotification();
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // --- FILTERS FOR TABS ---
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to midnight

  const soldProducts = products.filter(p => p.aantal === 0 || p.koperID != null);
  const activeProducts = products.filter(p => p.aantal > 0 && !p.koperID && p.isAuctionable);
  
  // "Action Needed": Not auctionable, but date is in the past (Expired)
  const expiredProducts = products.filter(p => {
    if (p.aantal === 0 || p.koperID || p.isAuctionable) return false;
    const pDate = p.beginDatum ? new Date(p.beginDatum) : null;
    return pDate && pDate < today;
  });

  // "Drafts": Not auctionable, date is today or future, or no date
  const draftProducts = products.filter(p => {
    if (p.aantal === 0 || p.koperID || p.isAuctionable) return false;
    const pDate = p.beginDatum ? new Date(p.beginDatum) : null;
    return !pDate || pDate >= today;
  });

  // Get current list based on tab
  const getDisplayedProducts = () => {
      switch(currentTab) {
          case 0: return activeProducts;
          case 1: return expiredProducts;
          case 2: return draftProducts;
          case 3: return soldProducts;
          default: return [];
      }
  };

  // --- ACTIONS ---

  const handleEditClick = (id: number) => {
    const product = products.find(p => p.productID === id);
    if (product) {
        setEditProduct(product);
        setFormData({
            naam: product.naam,
            beschrijving: product.beschrijving,
            minPrijs: product.minPrijs,
            aantal: product.aantal,
            beginDatum: product.beginDatum ? new Date(product.beginDatum).toISOString().split('T')[0] : ""
        });
        setOpenDialog(true);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editProduct) return;
    try {
        const token = localStorage.getItem("token");
        const payload = { ...editProduct, ...formData };

        const response = await fetch(`${baseUrl}/api/Product/product/${editProduct.productID}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const updated = await response.json();
            notify("Product bijgewerkt!", "success");
            setProducts(prev => prev.map(p => p.productID === editProduct.productID ? { ...p, ...updated } : p));
            setOpenDialog(false);
            setEditProduct(null);
        } else {
            notify("Kon product niet aanpassen.", "error");
        }
    } catch (e) {
        notify("Er ging iets mis.", "error");
    }
  };

  const handleStopSale = async (id: number) => {
      if(!confirm("Weet u zeker dat u de verkoop wilt stoppen?")) return;
      const token = localStorage.getItem("token");
      try {
          const response = await fetch(`${baseUrl}/api/Product/product/${id}/stop`, {
              method: 'PUT',
              headers: { "Authorization": `Bearer ${token}` }
          });
          if(response.ok) {
              notify("Verkoop gestopt. Product is nu een concept.", "info");
              setProducts(prev => prev.map(p => p.productID === id ? { ...p, isAuctionable: false } : p));
          } else {
              notify("Fout bij stoppen.", "error");
          }
      } catch(e) {
          notify("Netwerkfout.", "error");
      }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Verwijderen?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${baseUrl}/api/Product/product/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setProducts(prev => prev.filter(p => p.productID !== id));
        notify("Product verwijderd.", "success");
      } else {
        notify("Verwijderen mislukt.", "error");
      }
    } catch (error) {
       console.error(error);
    }
  };

  // --- EFFECTS ---

  useEffect(() => {
    const fetchMyProducts = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch(`${baseUrl}/api/Product/my-products`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Kon producten niet ophalen.");
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError("Er ging iets mis bij het laden.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyProducts();
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start().catch(err => console.error(err));
    
    connection.on("ReceiveAuctionResult", (data: any) => {
        setProducts(current => {
            return current.flatMap(p => {
                // If this is the product being sold
                if (p.productID === data.productId) {
                    const soldAmount = data.amount || 1;
                    const remainingStock = (p.aantal || 0) - soldAmount;

                    // 1. Create the new "Sold" entry for the UI immediately
                    const soldEntry: Product = {
                        ...p,
                        productID: -Date.now(), // Temp negative ID until refresh
                        aantal: soldAmount,
                        koperID: data.buyer,
                        minPrijs: data.price,
                        isAuctionable: false
                    };

                    // 2. Update the original "Live" product stock
                    const originalUpdated = {
                        ...p,
                        aantal: Math.max(0, remainingStock)
                    };

                    // If stock hits 0, the original stays but moves to "Sold" tab naturally.
                    // If stock > 0, original stays in "Live", soldEntry goes to "Sold".
                    return [originalUpdated, soldEntry];
                }
                return [p];
            });
        });
    });
    
    connectionRef.current = connection;
    return () => { connectionRef.current?.stop(); };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">Mijn Aanbod</Typography>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/verkoper')} sx={{ mr: 2 }}>
            Dashboard
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/verkoper')}>
            Nieuw
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* TABS NAVIGATION */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} aria-label="product tabs">
            <Tab label={`Live / Gepland (${activeProducts.length})`} />
            <Tab label={
                <Badge badgeContent={expiredProducts.length} color="error" sx={{ pr: 2 }}>
                    Actie Vereist
                </Badge>
            } />
            <Tab label={`Concepten (${draftProducts.length})`} />
            <Tab label={`Verkocht (${soldProducts.length})`} />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : getDisplayedProducts().length === 0 ? (
        <Alert severity="info">Geen producten in deze categorie.</Alert>
      ) : (
        <Grid container spacing={3}>
          {getDisplayedProducts().map((product) => (
            // Restored the correct Grid Size syntax
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.productID}>
              <ProductCard 
                product={{
                  id: product.productID,
                  name: product.naam,
                  price: product.minPrijs, 
                  imageUrl: product.imageUrl,
                  aantal: product.aantal, 
                  beginDatum: product.beginDatum,
                  isAuctionable: product.isAuctionable 
                }}
                onDelete={handleDelete}
                onEdit={handleEditClick}
                onStop={handleStopSale} 
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Product Wijzigen</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{mb: 2, color: 'text.secondary'}}>
                Pas de gegevens aan voor <strong>{editProduct?.naam}</strong>.
            </Typography>
            
            <TextField 
                label="Naam" 
                fullWidth 
                margin="dense" 
                value={formData.naam} 
                onChange={(e) => setFormData({ ...formData, naam: e.target.value })} 
            />
            
            <TextField 
                label="Beschrijving" 
                fullWidth 
                multiline 
                rows={3} 
                margin="dense" 
                value={formData.beschrijving} 
                onChange={(e) => setFormData({ ...formData, beschrijving: e.target.value })} 
            />
            
            <Box display="flex" gap={2}>
                <TextField 
                    label="Min. Prijs (€)" 
                    type="number" 
                    fullWidth 
                    margin="dense" 
                    value={formData.minPrijs} 
                    onChange={(e) => setFormData({ ...formData, minPrijs: Number(e.target.value) })} 
                />
                <TextField 
                    label="Aantal" 
                    type="number" 
                    fullWidth 
                    margin="dense" 
                    value={formData.aantal} 
                    onChange={(e) => setFormData({ ...formData, aantal: Number(e.target.value) })} 
                />
            </Box>
            
            <TextField 
                type="date" 
                label="Veiling Datum" 
                fullWidth 
                margin="dense" 
                InputLabelProps={{ shrink: true }} 
                value={formData.beginDatum} 
                onChange={(e) => setFormData({ ...formData, beginDatum: e.target.value })} 
                helperText="Kies een nieuwe datum om het product weer aan te bieden."
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdateProduct} variant="contained" color="primary">Opslaan & Opnieuw Aanbieden</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}