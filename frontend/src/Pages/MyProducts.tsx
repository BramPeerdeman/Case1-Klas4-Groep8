import { useEffect, useState, useRef } from "react";
import { Container, Typography, Grid, Button, Box, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProductCard from "../Components/ProductCard";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useNotification } from "../Contexts/NotificationContext";
import * as signalR from "@microsoft/signalr";

interface Product {
  productID: number;
  naam: string;
  minPrijs: number;
  imageUrl: string;
  beschrijving: string;
  aantal: number;
  beginDatum: string; // Added field for date editing
}

export default function MyProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // State for Editing
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newDate, setNewDate] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const navigate = useNavigate();
  const { notify } = useNotification();
  
  // Ref to hold connection to clean up properly
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // Open the edit dialog
  const handleEditClick = (id: number) => {
    const product = products.find(p => p.productID === id);
    if (product) {
        setEditProduct(product);
        // Format date to YYYY-MM-DD for the input field
        const dateStr = product.beginDatum ? new Date(product.beginDatum).toISOString().split('T')[0] : "";
        setNewDate(dateStr);
        setOpenDialog(true);
    }
  };

  // Save the new date
  const handleUpdateDate = async () => {
    if (!editProduct || !newDate) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${baseUrl}/api/Product/product/${editProduct.productID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ ...editProduct, beginDatum: newDate })
        });

        if (response.ok) {
            if (notify) notify("Datum aangepast!", "success");
            
            // Update local state
            setProducts(prev => prev.map(p => 
                p.productID === editProduct.productID ? { ...p, beginDatum: newDate } : p
            ));
            
            setOpenDialog(false);
            setEditProduct(null);
        } else {
            if (notify) notify("Kon datum niet aanpassen.", "error");
        }
    } catch (e) {
        console.error(e);
        if (notify) notify("Er ging iets mis.", "error");
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
        // IMPROVED ERROR HANDLING
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
            "Authorization": `Bearer ${token}`, // Crucial: Send the token so backend knows who you are
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
        // data structure: { productId, sold, buyer, price, amount, ... }
        
        setProducts(currentProducts => {
            // Check if the sold product is in our list
            const exists = currentProducts.find(p => p.productID === data.productId);
            if (!exists) return currentProducts; // Not one of our products

            // Update the specific product
            return currentProducts.map(p => {
                if (p.productID === data.productId) {
                    const soldAmount = data.amount || 1;
                    const newStock = (p.aantal || 0) - soldAmount;

                    // If stock is depleted, remove from list (return null to filter out)
                    if (newStock <= 0) return null;
                    
                    // Otherwise update count
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
            onClick={() => navigate('/verkoper')} // Back to Dashboard/Add page
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
            <Grid size={{xs:12, sm:6, md:4}} key={product.productID}>
              <ProductCard 
                product={{
                  id: product.productID,
                  name: product.naam,
                  // Use MinPrijs for seller view
                  price: product.minPrijs, 
                  imageUrl: product.imageUrl,
                  aantal: product.aantal, // Pass quantity to card
                  beginDatum: product.beginDatum
                }}
                // PASS THE DELETE FUNCTION
                onDelete={handleDelete}
                // PASS THE EDIT FUNCTION
                onEdit={handleEditClick}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* EDIT DATE DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Verplaats Veiling</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{mb: 2, mt: 1}}>
                Kies een nieuwe startdatum voor <strong>{editProduct?.naam}</strong>.
            </Typography>
            <TextField
                type="date"
                fullWidth
                variant="outlined"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Annuleren</Button>
            <Button onClick={handleUpdateDate} variant="contained" color="primary">Opslaan</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}