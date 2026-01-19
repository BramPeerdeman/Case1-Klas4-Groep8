import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Grid, Typography, Button, Box, Paper, Chip, CircularProgress } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { getImageUrl } from "../Utils/ImageUtils"; 
import { usePageTitle } from "../Hooks/usePageTitle";

export default function Detail() {
  usePageTitle("Product Detail");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [auctionStatus, setAuctionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  useEffect(() => {
    const fetchData = async () => {
        try {
            const prodRes = await fetch(`${baseUrl}/api/Product/products`);
            const prodData = await prodRes.json();
            
            const found = prodData.find((p: any) => p.productID.toString() === id);
            setProduct(found);

            if (found) {
                const statusRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setAuctionStatus(statusData);
                }
            }
        } catch (e) { 
            console.error("Fout bij laden detail:", e); 
        } finally {
            setLoading(false);
        }
    };
    if(id) fetchData();
  }, [id]);

  if (loading) {
      return (
        <Container sx={{ mt: 10, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Product laden...</Typography>
        </Container>
      );
  }

  if (!product) {
      return (
        <Container sx={{ mt: 10 }}>
            <Typography variant="h5">Product niet gevonden.</Typography>
            <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>Terug naar home</Button>
        </Container>
      );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 3 }}>
        Terug naar overzicht
      </Button>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Grid container spacing={6}>
            
            {/* LINKERKANT: Afbeelding */}
            <Grid size={{xs:12, md:6}}>
                <Box 
                    component="img"
                    src={getImageUrl(product.imageUrl)}
                    alt={product.naam} 
                    sx={{ 
                        width: '100%', 
                        maxHeight: '500px',
                        objectFit: 'contain',
                        borderRadius: 4,
                        bgcolor: '#f9f9f9'
                    }} 
                />
            </Grid>

            {/* RECHTERKANT: Info */}
            <Grid size={{xs:12, md:6}} display="flex" flexDirection="column" justifyContent="center">
                <Typography variant="h3" fontWeight="bold" gutterBottom>{product.naam}</Typography>
                
                {/* PRIJS IS HIER VERWIJDERD */}
                
                {/* Specificaties: Locatie & Aantal */}
                <Box display="flex" gap={2} mb={3} mt={2}>
                    {product.locatie && (
                        <Chip 
                            icon={<LocationOnIcon />} 
                            label={product.locatie} 
                            variant="outlined" 
                        />
                    )}
                    {product.aantal > 1 && (
                        <Chip 
                            label={`Voorraad: ${product.aantal} stuks`} 
                            color="primary" 
                            variant="outlined" 
                        />
                    )}
                </Box>

                <Typography variant="body1" paragraph sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
                    {product.beschrijving || "Geen beschrijving beschikbaar."}
                </Typography>

                <Box mt={4}>
                    {auctionStatus?.isRunning ? (
                        <Box 
                            textAlign="center" 
                            p={2} 
                            bgcolor="#e8f5e9" 
                            borderRadius={2} 
                            border="1px solid #4caf50"
                        >
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                                🔥 NU LIVE IN DE VEILING
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ga naar het hoofdscherm om mee te bieden op dit product.
                            </Typography>
                        </Box>
                    ) : (
                        <Box textAlign="center" p={2} bgcolor="#f0f0f0" borderRadius={2}>
                            <Typography variant="body1" color="text.secondary">
                                Dit product is momenteel niet live in de veiling.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}