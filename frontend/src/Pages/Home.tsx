import { useEffect, useState } from "react";
import { Container, Typography, Box, Button, Grid, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import GavelIcon from '@mui/icons-material/Gavel';
import * as signalR from "@microsoft/signalr";
import ProductCard from "../Components/ProductCard"; // <--- 1. Import Toevoegen
import { getImageUrl } from "../Utils/ImageUtils"; // <--- 2. Import Toevoegen

export default function Home() {
  const navigate = useNavigate();
  const [activeAuction, setActiveAuction] = useState<any>(null);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // 1. DATA LADEN (Producten + Actieve Veiling)
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

  // 2. LIVE UPDATES (SignalR)
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
          // AANGEPAST: Gebruik getImageUrl zodat uploads ook werken als achtergrond
          backgroundImage: activeProduct?.imageUrl 
            ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${getImageUrl(activeProduct.imageUrl)})`
            : 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mb: 6
      }}>
        <Container maxWidth="md">
          {activeAuction && activeProduct ? (
            // SCENARIO A: Er is een veiling bezig!
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
            // SCENARIO B: Rustig
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
                // AANGEPAST: We gebruiken hier jouw ProductCard component
                <Grid size={{xs:12, sm:6, md:4}} key={product.productID}>
                    <ProductCard 
                        product={{
                            id: product.productID,
                            name: product.naam,
                            price: product.startPrijs,
                            imageUrl: product.imageUrl,
                            locatie: product.locatie,
                            aantal: product.aantal
                        }}
                    />
                </Grid>
            ))}
        </Grid>
      </Container>
    </Box>
  );
}