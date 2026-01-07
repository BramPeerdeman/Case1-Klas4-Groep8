import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Typography, Button, Card, CardMedia, CardContent, Box, CircularProgress, Chip, Grid } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getImageUrl } from "../Utils/ImageUtils"; // Helper import

interface Product {
  productID: number;
  naam: string;
  beschrijving: string;
  startPrijs: number;
  imageUrl?: string;
  locatie?: string;
  aantal?: number;
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
        const response = await fetch(`${baseUrl}/api/Product/products`); // Of specifieke ID endpoint als je die hebt
        const data = await response.json();
        const found = data.find((p: Product) => p.productID === Number(id));
        setProduct(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;
  if (!product) return <Container sx={{mt:4}}><Typography>Product niet gevonden.</Typography></Container>;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Terug
      </Button>

      <Card elevation={3}>
        {/* AANGEPAST: Gebruik getImageUrl voor de grote foto */}
        <CardMedia
          component="img"
          height="400"
          image={getImageUrl(product.imageUrl)}
          alt={product.naam}
          sx={{ objectFit: 'contain', bgcolor: '#f5f5f5' }}
        />
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {product.naam}
            </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              € {product.startPrijs.toFixed(2)}
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {product.beschrijving}
          </Typography>

          <Box mt={3} p={2} bgcolor="grey.50" borderRadius={2}>
            <Typography variant="h6" gutterBottom>Specificaties</Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs:6}}>
                    <Typography variant="body2" color="text.secondary">Locatie</Typography>
                    <Typography variant="body1" fontWeight="medium">{product.locatie || "Onbekend"}</Typography>
                </Grid>
                <Grid size={{ xs:6}}>
                    <Typography variant="body2" color="text.secondary">Aantal</Typography>
                    <Typography variant="body1" fontWeight="medium">{product.aantal || 1} stuks</Typography>
                </Grid>
            </Grid>
          </Box>

          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            sx={{ mt: 4 }}
            onClick={() => navigate(`/klok/${product.productID}`)}
          >
            Naar de Veiling
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}