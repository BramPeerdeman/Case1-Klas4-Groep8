import { useEffect, useState } from "react";
import { Container, Typography, Grid, Button, Box, Alert, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProductCard from "../Components/ProductCard"; // Or copy the Card logic from Home if you prefer consistency
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

interface Product {
  productID: number;
  naam: string;
  minPrijs: number;
  imageUrl: string;
  beschrijving: string;
}

export default function MyProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyProducts = async () => {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

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
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid size={{xs:12, sm:6, md:4}} key={product.productID}>
              {/* Mapping API data to ProductCard props */}
              <ProductCard 
                product={{
                  id: product.productID,
                  name: product.naam,
                  price: product.minPrijs,
                  imageUrl: product.imageUrl
                }} 
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}