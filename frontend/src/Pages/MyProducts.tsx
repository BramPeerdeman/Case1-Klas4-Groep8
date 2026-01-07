import { useEffect, useState, useRef } from "react";
import { Container, Typography, Grid, Button, Box, Alert, CircularProgress } from "@mui/material";
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
  aantal: number; // Added field for quantity
}

export default function MyProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  // Ref to hold connection to clean up properly
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

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
        if (notify) notify("Verwijderen mislukt.", "error");
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
                  aantal: product.aantal // Pass quantity to card
                }}
                // PASS THE DELETE FUNCTION
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}