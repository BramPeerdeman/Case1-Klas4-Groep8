import { useParams, useNavigate } from "react-router-dom";
import { Box, Container, Typography, Button, CircularProgress, Card, CardMedia, CardContent, TextField } from "@mui/material"; // Added TextField
import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "../Contexts/AuthContext";
import { getImageUrl } from "../Utils/ImageUtils";

export default function Klok() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [product, setProduct] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<"WAITING" | "RUNNING" | "SOLD" | "TIMEOUT">("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");
  
  // NEW: State for Quantity
  const [quantity, setQuantity] = useState<number>(1);
  const [soldAmount, setSoldAmount] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  const dropDuration = 30000; 

  // 1. SIGNALR VERBINDING & LUISTERAARS
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start()
        .then(() => console.log("SignalR Connected"))
        .catch(err => console.error("SignalR Connection Error: ", err));

    connection.on("ReceiveNewAuction", (data: any) => {
        if (timerRef.current) clearInterval(timerRef.current);
        navigate(`/klok/${data.productId}`);
    });

    // Modified Handler to accept amount
    connection.on("ReceiveAuctionResult", (data: any) => {
        if (id && data.productId.toString() === id) {
            stopClock();
            setStatus("SOLD");
            setBuyerName(data.buyer);
            setCurrentPrice(data.price);
            setSoldAmount(data.amount || 1); // Set sold amount
        }
    });

    connectionRef.current = connection;
    return () => {
        connection.stop();
        stopClock();
    };
  }, [id, navigate]); 

  // 2. PRODUCT DATA LADEN
  useEffect(() => {
    const loadProductData = async () => {
        if (!id) return;

        try {
            const res = await fetch(`${baseUrl}/api/Product/products`);
            if (!res.ok) return;
            
            const data = await res.json();
            const found = data.find((p: any) => p.productID.toString() === id);

            if (found) {
                setProduct(found);
                setQuantity(1); // Reset quantity selector to 1 for new product
                
                const statusRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
                if (statusRes.ok) {
                    const serverState = await statusRes.json();
                    
                    if (serverState.isSold) {
                        setStatus("SOLD");
                        setBuyerName(serverState.buyerName);
                        setCurrentPrice(serverState.finalPrice);
                    } else if (serverState.isRunning) {
                        startClockAnimation(serverState.startTime, found.startPrijs);
                    } else {
                        setCurrentPrice(found.startPrijs);
                        setStatus("WAITING");
                    }
                }
            }
        } catch (e) {
            console.error("Fout bij laden data", e);
        }
    };

    loadProductData();
  }, [id]);

  // ... [Keep startClockAnimation and stopClock unchanged] ...
  const startClockAnimation = (startTimeString: string, startPrice: number) => {
      stopClock(); 
      setStatus("RUNNING");
      
      const startTime = new Date(startTimeString).getTime();
      const minPrice = startPrice * 0.3; 

      timerRef.current = window.setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;

          if (elapsed >= dropDuration) {
              setCurrentPrice(minPrice);
              setStatus("TIMEOUT");
              stopClock();
          } else {
              const progress = elapsed / dropDuration;
              const newPrice = startPrice - (progress * (startPrice - minPrice));
              setCurrentPrice(newPrice);
          }
      }, 50); 
  };

  const stopClock = () => {
      if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
      }
  };

  // 4. KOOP ACTIE
  const handleBuy = async () => {
      if (status !== "RUNNING" || !currentPrice) return;
      stopClock();

      try {
          const token = localStorage.getItem("token");
          const myName = user?.name || user?.email || "Klant";

          const response = await fetch(`${baseUrl}/api/Veiling/koop`, {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                  productId: Number(id),
                  buyerName: myName,
                  price: currentPrice,
                  buyerId: user?.sub,
                  aantal: quantity // Send selected quantity
              })
          });

          if (!response.ok) {
              console.warn("Koop mislukt");
          }
      } catch (e) {
          console.error("Fout bij kopen", e);
      }
  };

  if (!id || !product) return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4} alignItems="center" justifyContent="center">
        
        {/* Left Side: Product Info */}
        <Box flex={1}>
            <Card elevation={4}>
                {product.imageUrl && (
                    <CardMedia
                        component="img"
                        height="400"
                        image={getImageUrl(product.imageUrl)}
                        alt={product.naam}
                        sx={{ objectFit: "contain", p: 2, bgcolor: "#f5f5f5" }}
                    />
                )}
                <CardContent>
                    <Typography variant="h4" gutterBottom>{product.naam}</Typography>
                    <Typography variant="body1" color="text.secondary">{product.beschrijving}</Typography>
                    <Box mt={2} display="flex" justifyContent="space-between">
                        <Typography variant="h6">Startprijs: € {product.startPrijs}</Typography>
                        {/* Show available stock */}
                        <Typography variant="h6" color="primary">
                             Voorraad: {product.aantal} stuks
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>

        {/* Right Side: Clock & Controls */}
        <Box flex={1} display="flex" flexDirection="column" alignItems="center" textAlign="center">
            
            {status === "WAITING" && <Typography variant="h3" color="warning.main">Klaarzetten...</Typography>}
            {status === "TIMEOUT" && <Typography variant="h3" color="error">Niet Verkocht</Typography>}
            
            {status === "SOLD" ? (
                <Box sx={{ p: 4, border: '4px solid green', borderRadius: 4, mb: 4, bgcolor: '#e8f5e9' }}>
                    <Typography variant="h2" color="success.main" fontWeight="bold">VERKOCHT!</Typography>
                    <Typography variant="h4">€ {currentPrice?.toFixed(2)}</Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>
                        {soldAmount} stuks aan {buyerName}
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ 
                    position: 'relative', width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: status === "RUNNING" ? 'primary.main' : 'grey.300',
                    borderRadius: '50%', boxShadow: 6, mb: 4,
                    transition: 'background-color 0.3s'
                }}>
                    <Typography variant="h1" color="white" fontWeight="bold">
                        {currentPrice ? `€ ${Math.floor(currentPrice)}` : "€ -"}
                        <Typography component="span" variant="h3" sx={{verticalAlign: 'super'}}>
                            ,{currentPrice ? (currentPrice % 1).toFixed(2).substring(2) : "--"}
                        </Typography>
                    </Typography>
                </Box>
            )}

            {/* Input & Button Container */}
            <Box display="flex" gap={2} width="100%" maxWidth={400}>
                {/* Quantity Input */}
                <TextField
                    label="Aantal"
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        // Clamp value between 1 and max stock
                        if (!isNaN(val)) setQuantity(Math.min(Math.max(1, val), product.aantal));
                    }}
                    disabled={status !== "RUNNING"}
                    InputProps={{ inputProps: { min: 1, max: product.aantal } }}
                    sx={{ width: 100, bgcolor: 'white', borderRadius: 1 }}
                />

                {/* Buy Button */}
                <Button 
                    variant="contained" 
                    color="error" 
                    size="large" 
                    fullWidth
                    onClick={handleBuy}
                    disabled={status !== "RUNNING"}
                    sx={{ 
                        height: 56, // Match standard TextField height
                        fontSize: '1.5rem', 
                        borderRadius: 2,
                        boxShadow: status === "RUNNING" ? '0 0 30px rgba(211, 47, 47, 0.6)' : 'none',
                    }}
                >
                    MIJN!
                </Button>
            </Box>
            
            {status === "RUNNING" && (
                <Typography variant="caption" sx={{ mt: 2 }}>
                    Kies aantal en druk snel!
                </Typography>
            )}
        </Box>
      </Box>
    </Container>
  );
}