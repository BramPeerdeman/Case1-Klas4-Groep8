import { useEffect, useState, useRef } from "react";
import { Container, Typography, Grid, Button, Box, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
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
  isAuctionable: boolean; // ADDED
}

export default function MyProducts() {
  usePageTitle("Mijn Producten");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // State for Editing
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  
  // Refactored: Form state object instead of single date string
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
  
  // Ref to hold connection to clean up properly
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // Open the edit dialog and populate form
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

  // Save the product updates
  const handleUpdateProduct = async () => {
    if (!editProduct) return;

    try {
        const token = localStorage.getItem("token");
        
        // Construct payload from form data
        const payload = {
            ...editProduct,
            naam: formData.naam,
            beschrijving: formData.beschrijving,
            minPrijs: formData.minPrijs,
            aantal: formData.aantal,
            beginDatum: formData.beginDatum
        };

        const response = await fetch(`${baseUrl}/api/Product/product/${editProduct.productID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const updatedProduct = await response.json();
            if (notify) notify("Product aangepast!", "success");
            
            // Update local state with the response from backend
            setProducts(prev => prev.map(p => 
                p.productID === editProduct.productID ? { ...p, ...updatedProduct } : p
            ));
            
            setOpenDialog(false);
            setEditProduct(null);
        } else {
            const err = await response.text();
            if (notify) notify(err || "Kon product niet aanpassen.", "error");
        }
    } catch (e) {
        console.error(e);
        if (notify) notify("Er ging iets mis.", "error");
    }
  };

  // Stop Sale functionality
  const handleStopSale = async (id: number) => {
      if(!confirm("Weet u zeker dat u de verkoop wilt stoppen? Het product wordt teruggezet naar uw lijst als concept.")) return;

      const token = localStorage.getItem("token");
      try {
          const response = await fetch(`${baseUrl}/api/Product/product/${id}/stop`, {
              method: 'PUT',
              headers: { "Authorization": `Bearer ${token}` }
          });

          if(response.ok) {
              notify("Verkoop gestopt. Product is nu 'Onveilbaar'.", "info");
              // Update local state: set isAuctionable to false
              setProducts(prev => prev.map(p => 
                  p.productID === id ? { ...p, isAuctionable: false } : p
              ));
          } else {
              const err = await response.text();
              notify("Fout: " + err, "error");
          }
      } catch(e) {
          console.error(e);
          notify("Netwerkfout bij stoppen verkoop.", "error");
      }
  };

  //Delete functionaliteit
  const handleDelete = async (id: number) => {
    if (!window.confirm("Weet u zeker dat u dit product wilt verwijderen?")) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${baseUrl}/api/Product/product/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove from local state immediately so user sees result
        setProducts((prevProducts) => prevProducts.filter(p => p.productID !== id));
        if (notify) notify("Product verwijderd.", "success");
      } else {
        const errMsg = await response.text();
        console.error("Delete failed:", errMsg);
        if (notify) notify(errMsg || "Verwijderen mislukt.", "error");
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  // Fetch initial products
  useEffect(() => {
    const fetchMyProducts = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(`${baseUrl}/api/Product/my-products`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          throw new Error("Kon producten niet ophalen.");
        }

        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError("Er ging iets mis bij het laden van uw producten.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyProducts();
  }, []);

  // SignalR Connection for Real-time Updates
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start()
        .then(() => console.log("Connected to AuctionHub"))
        .catch(err => console.error("SignalR Connection Error: ", err));

    connection.on("ReceiveAuctionResult", (data: any) => {
        setProducts(currentProducts => {
            const exists = currentProducts.find(p => p.productID === data.productId);
            if (!exists) return currentProducts; 

            return currentProducts.map(p => {
                if (p.productID === data.productId) {
                    const soldAmount = data.amount || 1;
                    const newStock = (p.aantal || 0) - soldAmount;
                    if (newStock <= 0) return null;
                    return { ...p, aantal: newStock };
                }
                return p;
            }).filter((p): p is Product => p !== null);
        });
    });

    connectionRef.current = connection;

    return () => {
        if (connectionRef.current) {
            connectionRef.current.stop();
        }
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Mijn Aanbod
        </Typography>
        <Box>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/verkoper')} 
            sx={{ mr: 2 }}
          >
            Terug
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => navigate('/verkoper')} 
          >
            Nieuw Product
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : products.length === 0 ? (
        <Alert severity="info">U heeft nog geen producten aangeboden.</Alert>
      ) :  (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid size = {{xs: 12, sm: 6, md: 4}} key={product.productID}>
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

      {/* EDIT PRODUCT DIALOG */}
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
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdateProduct} variant="contained" color="primary">Opslaan</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}