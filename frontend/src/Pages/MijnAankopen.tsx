import { useEffect, useState } from "react";
import { Container, Typography, Grid, Card, CardContent, CardMedia, Box, Chip, CircularProgress, Alert } from "@mui/material";
import EventIcon from '@mui/icons-material/Event';
import EuroIcon from '@mui/icons-material/Euro';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { getImageUrl } from "../Utils/ImageUtils";
import { usePageTitle } from "../Hooks/usePageTitle";

// Updated interface to match Backend PurchaseHistoryDto
interface Aankoop {
  productID: number;
  naam: string;
  imageUrl: string;
  beschrijving: string;
  verkoopPrijs: number; // Changed from eindprijs to match backend DTO
  aantal: number;       // New field
  datum: string;        // Changed from eindDatum to match backend DTO
}

export default function MijnAankopen() {
  usePageTitle("Mijn Aankopen");
  const [aankopen, setAankopen] = useState<Aankoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAankopen = async () => {
      try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

        const response = await fetch(`${baseUrl}/api/Product/geschiedenis`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            setAankopen(data);
        } else {
            if(response.status === 401) setError("U bent niet ingelogd.");
            else setError("Kon geschiedenis niet ophalen.");
        }
      } catch (err) {
        console.error(err);
        setError("Fout bij verbinden met server.");
      } finally {
        setLoading(false);
      }
    };

    fetchAankopen();
  }, []);

  if (loading) return <Container sx={{mt: 4, textAlign: 'center'}}><CircularProgress /></Container>;

  if (error) return <Container sx={{mt: 4}}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{mb: 4}}>
         🛍️ Mijn Gewonnen Veilingen
      </Typography>

      {aankopen.length === 0 ? (
        <Box textAlign="center" py={5} bgcolor="#f5f5f5" borderRadius={4}>
            <Typography variant="h6" color="text.secondary">
                U heeft nog geen veilingen gewonnen.
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Ga snel naar het live scherm en doe mee!
            </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {aankopen.map((product) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.productID}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Date Chip */}
                <Chip 
                    icon={<EventIcon sx={{ color: 'white !important' }} />} 
                    label={product.datum ? new Date(product.datum).toLocaleDateString() : 'Onbekend'} 
                    sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }} 
                />

                <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(product.imageUrl)}
                    alt={product.naam}
                    sx={{ objectFit: 'cover' }}
                />

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {product.naam}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {product.beschrijving ? product.beschrijving.substring(0, 100) + "..." : ""}
                  </Typography>
                  
                  {/* New Quantity Display */}
                  <Chip 
                    icon={<ShoppingBagIcon />} 
                    label={`Gekocht: ${product.aantal} stuks`} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                    sx={{ mb: 2 }} 
                  />

                  <Box display="flex" alignItems="center" gap={1} mt="auto">
                    <EuroIcon color="success" />
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                        {product.verkoopPrijs?.toFixed(2) ?? "0.00"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        (per stuk)
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}