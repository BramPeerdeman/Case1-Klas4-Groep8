import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Grid, Typography, Button, Box, Paper, Chip } from "@mui/material";
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [auctionStatus, setAuctionStatus] = useState<any>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  useEffect(() => {
    const fetchData = async () => {
        try {
            // 1. Product Data
            const prodRes = await fetch(`${baseUrl}/api/Product/products`);
            const prodData = await prodRes.json();
            const found = prodData.find((p: any) => p.productID.toString() === id);
            setProduct(found);

            // 2. Veiling Status Checken
            const statusRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setAuctionStatus(statusData);
            }
        } catch (e) { console.error(e); }
    };
    if(id) fetchData();
  }, [id]);

  if (!product) return <Typography sx={{p:4}}>Laden...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 3 }}>
        Terug naar overzicht
      </Button>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Grid container spacing={6}>
            {/* Afbeelding */}
            <Grid size={{xs:12, md:6}}>
                <img 
                    src={product.imageUrl} 
                    alt={product.naam} 
                    style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }} 
                />
            </Grid>

            {/* Info */}
            <Grid size={{xs:12, md:6}} display="flex" flexDirection="column" justifyContent="center">
                <Typography variant="h3" fontWeight="bold" gutterBottom>{product.naam}</Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                    Richtprijs: € {product.startPrijs}
                </Typography>
                
                <Typography variant="body1" paragraph sx={{ mt: 2, color: 'text.secondary' }}>
                    {product.beschrijving || "Geen beschrijving beschikbaar. Een prachtig product van topkwaliteit, vers van de kweker."}
                </Typography>

                <Box mt={4}>
                    {auctionStatus?.isRunning ? (
                        <Button 
                            variant="contained" 
                            color="error" 
                            size="large" 
                            startIcon={<GavelIcon />}
                            onClick={() => navigate(`/klok/${id}`)}
                            fullWidth
                            sx={{ py: 2, fontSize: '1.2rem' }}
                        >
                            GA NAAR LIVE VEILING
                        </Button>
                    ) : (
                        <Chip label="Nog niet in de veiling" color="default" />
                    )}
                </Box>
            </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}