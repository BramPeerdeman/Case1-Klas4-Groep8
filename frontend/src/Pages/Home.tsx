import { Box, Container, Grid, Typography, Button, Card, CardContent, CardMedia, Chip } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProducts } from "../Data/Products"; 

export default function Home() {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  
  const { products, loading } = fetchProducts();
  
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    const checkActive = async () => {
        try {
            const res = await fetch(`${baseUrl}/api/Auction/active`);
            if (res.ok) {
                const data = await res.json();
                setActiveProductId(data.activeId);
            }
        } catch (e) { console.error(e); }
    };
    
    checkActive();
    pollingRef.current = window.setInterval(checkActive, 1000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const heroProduct = activeProductId 
    ? products.find(p => p.productID === activeProductId) 
    : (products.length > 0 ? products[0] : null);

  if (loading) return <div>Laden...</div>;

  return (
    <>
      {/* HERO / LIVE SECTIE */}
      {heroProduct && (
        <Box sx={{
            position: "relative", width: "100%", height: "500px", mb: 4,
            backgroundImage: `url('${heroProduct.imageUrl}')`,
            backgroundSize: "cover", backgroundPosition: "center",
            transition: "background-image 0.5s ease-in-out"
        }}>
          <Box sx={{ 
             position: "absolute", inset: 0,
             background: activeProductId 
                ? 'linear-gradient(to top, rgba(211, 47, 47, 0.85), rgba(0,0,0,0.1))' 
                : 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.1))'
          }} />

          <Container sx={{ position: "relative", height: "100%", display: "flex", alignItems: "flex-end", pb: 6 }}>
            <Box color="white">
              {activeProductId === heroProduct.productID && (
                  <Chip label="🔴 NU LIVE: BIEDEN MAAR!" color="error" sx={{ mb: 2, fontWeight: 'bold' }} />
              )}
              <Typography variant="h2" fontWeight="bold">{heroProduct.naam}</Typography>
              <Typography variant="h6" sx={{ mb: 3 }}>{heroProduct.beschrijving}</Typography>
              
              <Button
                variant="contained"
                color={activeProductId ? "error" : "primary"}
                size="large"
                onClick={() => navigate(`/klok/${heroProduct.productID}`)}
                sx={{ px: 5, py: 1.5, borderRadius: 50, fontSize: '1.2rem' }}
              >
                {activeProductId ? "GA NAAR DE ZAAL" : "Bekijk Product"}
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      {/* CATALOGUS */}
      <Container sx={{ pb: 8 }}>
        <Typography variant="h4" gutterBottom>Alle Producten</Typography>
        
        {/* === HIER IS DE AANGEPASTE GRID === */}
        <Grid container spacing={4}>
          {products.map((p) => (
            <Grid key={p.productID} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia component="img" height="200" image={p.imageUrl} alt={p.naam} />
                <CardContent>
                  <Typography variant="h6">{p.naam}</Typography>
                  <Typography variant="body2" color="text.secondary">Startprijs: €{p.startPrijs}</Typography>
                  <Button size="small" onClick={() => navigate(`/klok/${p.productID}`)} sx={{ mt: 2 }}>
                    Bekijk
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
      </Container>
    </>
  );
}