import { useEffect, useState } from "react";
import { Container, Typography, Box, Button, Grid, Chip, Card, CardMedia, CardContent, CardActionArea } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GavelIcon from '@mui/icons-material/Gavel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import * as signalR from "@microsoft/signalr";
import { getImageUrl } from "../Utils/ImageUtils"; 

export default function Home() {
  const navigate = useNavigate();
  const [activeAuction, setActiveAuction] = useState<any>(null);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // 1. DATA LADEN
  useEffect(() => {
    const loadData = async () => {
        try {
            const prodRes = await fetch(`${baseUrl}/api/Product/products`);
            const allProducts = await prodRes.json();
            setProducts(allProducts);

            const activeRes = await fetch(`${baseUrl}/api/Veiling/active`);
            if (activeRes.ok) {
                const auction = await activeRes.json();
                setActiveAuction(auction);
                const found = allProducts.find((p: any) => p.productID === auction.productId);
                setActiveProduct(found);
            }
        } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // 2. LIVE UPDATES
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start().catch(e => console.error(e));

    connection.on("ReceiveNewAuction", async (data: any) => {
        setActiveAuction({ productId: data.productId, startTime: data.startTime });
        const found = products.find(p => p.productID === data.productId);
        if(found) setActiveProduct(found);
    });

    connection.on("ReceiveAuctionResult", () => {
        setActiveAuction(null);
        setActiveProduct(null);
    });

    return () => { connection.stop(); };
  }, [products]);

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', pb: 8 }}>
      
      {/* --- HERO HEADER --- */}
      <Box sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          py: 10, 
          textAlign: 'center',
          backgroundImage: activeProduct?.imageUrl 
            ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${getImageUrl(activeProduct.imageUrl)})`
            : 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mb: 6
      }}>
        <Container maxWidth="md">
          {activeAuction && activeProduct ? (
            <>
                <Chip label="🔴 NU LIVE" color="error" sx={{ mb: 2, fontWeight: 'bold' }} />
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                    {activeProduct.naam}
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                    De klok tikt! Bied mee voor de beste prijs.
                </Typography>
                <Button 
                    variant="contained" 
                    color="secondary" 
                    size="large" 
                    startIcon={<GavelIcon />}
                    onClick={() => navigate(`/klok/${activeProduct.productID}`)}
                    sx={{ px: 5, py: 1.5, fontSize: '1.2rem', borderRadius: 50 }}
                >
                    Ga naar Veiling
                </Button>
            </>
          ) : (
            <>
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                    Bloemenveiling
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                    Het platform voor de snelste en beste handel in bloemen.
                </Typography>
                <Button variant="outlined" color="inherit" onClick={() => window.scrollTo({top: 600, behavior:'smooth'})}>
                    Bekijk Aanbod
                </Button>
            </>
          )}
        </Container>
      </Box>

      {/* --- PRODUCT GRID --- */}
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight="bold" mb={4}>Ons Aanbod</Typography>
        <Grid container spacing={4}>
            {products.map((product) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.productID}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, position: 'relative' }}>
                        
                        {/* Aantal Chip is hier verwijderd */}

                        <CardActionArea onClick={() => navigate(`/product/${product.productID}`)}>
                            <CardMedia
                                component="img"
                                height="200"
                                image={getImageUrl(product.imageUrl)}
                                alt={product.naam}
                                sx={{ objectFit: 'cover' }}
                            />
                            <CardContent>
                                <Typography gutterBottom variant="h5" component="div">
                                    {product.naam}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {product.beschrijving ? product.beschrijving.substring(0, 60) + "..." : "Geen beschrijving."}
                                </Typography>
                                
                                {/* Locatie tonen we nog wel, dat is nuttige info */}
                                {product.locatie && (
                                    <Box display="flex" alignItems="center" mb={1} color="text.secondary">
                                        <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
                                        <Typography variant="body2">{product.locatie}</Typography>
                                    </Box>
                                )}

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    {/* Prijs is hier verwijderd */}
                                    
                                    {/* Alleen Live chip blijft over rechtsonder */}
                                    {activeAuction && activeAuction.productId === product.productID && (
                                        <Chip label="LIVE" color="error" size="small" />
                                    )}
                                </Box>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                </Grid>
            ))}
        </Grid>
      </Container>
    </Box>
  );
}