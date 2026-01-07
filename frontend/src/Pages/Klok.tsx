import { useParams, useNavigate } from "react-router-dom";
import { Box, Container, Typography, Button, CircularProgress, Card, CardMedia, CardContent } from "@mui/material";
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

  const timerRef = useRef<number | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  const dropDuration = 30000; // 30 seconden looptijd

  // 1. SIGNALR VERBINDING & LUISTERAARS
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start()
        .then(() => console.log("SignalR Connected"))
        .catch(err => console.error("SignalR Connection Error: ", err));

    // EVENT: Er start een nieuwe veiling (automatisch navigeren!)
    connection.on("ReceiveNewAuction", (data: any) => {
        console.log("Nieuwe veiling ontvangen:", data);
        // Stop oude timers
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Navigeer naar de nieuwe URL (dit herlaadt de component met het nieuwe ID)
        navigate(`/klok/${data.productId}`);
    });

    // EVENT: Iemand heeft gekocht
    connection.on("ReceiveAuctionResult", (data: any) => {
        console.log("Veiling resultaat:", data);
        // Is dit bericht voor ons huidige product?
        // We checken id (uit URL) vs data.productId
        if (id && data.productId.toString() === id) {
            stopClock();
            setStatus("SOLD");
            setBuyerName(data.buyer);
            setCurrentPrice(data.price);
        }
    });

    connectionRef.current = connection;

    // Cleanup bij verlaten pagina
    return () => {
        connection.stop();
        stopClock();
    };
  }, [id, navigate]); // Herstart als ID of navigate verandert

  // 2. PRODUCT DATA LADEN (Zodra ID verandert)
  useEffect(() => {
    const loadProductData = async () => {
        if (!id) return;

        try {
            // A. Haal product info op
            const res = await fetch(`${baseUrl}/api/Product/products`);
            if (!res.ok) return;
            
            const data = await res.json();
            const found = data.find((p: any) => p.productID.toString() === id);

            if (found) {
                setProduct(found);
                
                // B. Check de live status (voor als je pagina ververst midden in een veiling)
                const statusRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
                if (statusRes.ok) {
                    const serverState = await statusRes.json();
                    
                    if (serverState.isSold) {
                        setStatus("SOLD");
                        setBuyerName(serverState.buyerName);
                        setCurrentPrice(serverState.finalPrice);
                    } else if (serverState.isRunning) {
                        // Hij loopt nog! Synchroniseer de klok.
                        startClockAnimation(serverState.startTime, found.startPrijs);
                    } else {
                        // Hij staat klaar, maar loopt nog niet (of is net aangemaakt)
                        // We wachten op het SignalR bericht of zetten hem klaar
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

  // 3. KLOK ANIMATIE LOGICA
  const startClockAnimation = (startTimeString: string, startPrice: number) => {
      stopClock(); // Zeker weten dat er geen oude timer loopt
      setStatus("RUNNING");
      
      const startTime = new Date(startTimeString).getTime();
      const minPrice = startPrice * 0.3; // Minimumprijs is 30% van start

      timerRef.current = window.setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTime;

          if (elapsed >= dropDuration) {
              setCurrentPrice(minPrice);
              setStatus("TIMEOUT");
              stopClock();
          } else {
              // Bereken prijs op basis van tijd
              const progress = elapsed / dropDuration;
              const newPrice = startPrice - (progress * (startPrice - minPrice));
              setCurrentPrice(newPrice);
          }
      }, 50); // Update elke 50ms
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
      
      // Stop lokaal direct (visuele feedback)
      stopClock();

      try {
          const token = localStorage.getItem("token");
          // TODO: Haal echte naam uit token/context. Voor nu "Ik".
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
                  buyerId: user?.sub
              })
          });

          if (!response.ok) {
              console.warn("Iemand anders was sneller of er ging iets mis.");
              // Optioneel: herstart klok of toon error
          }
      } catch (e) {
          console.error("Fout bij kopen", e);
      }
  };

  // --- RENDER ---
  if (!id) return (
      <Container sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="h4">Wachten op de volgende veiling...</Typography>
          <CircularProgress sx={{ mt: 4 }} />
      </Container>
  );

  if (!product) return (
      <Container sx={{ mt: 10, textAlign: 'center' }}>
          <Typography>Product laden...</Typography>
      </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4} alignItems="center" justifyContent="center">
        
        {/* Links: Product Plaatje & Info */}
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
                    <Typography variant="h6" mt={2}>
                        Startprijs: € {product.startPrijs}
                    </Typography>
                </CardContent>
            </Card>
        </Box>

        {/* Rechts: De Grote Klok */}
        <Box flex={1} display="flex" flexDirection="column" alignItems="center" textAlign="center">
            
            {/* Status Tekst */}
            {status === "WAITING" && <Typography variant="h3" color="warning.main">Klaarzetten...</Typography>}
            {status === "TIMEOUT" && <Typography variant="h3" color="error">Niet Verkocht</Typography>}
            
            {status === "SOLD" ? (
                <Box sx={{ p: 4, border: '4px solid green', borderRadius: 4, mb: 4, bgcolor: '#e8f5e9' }}>
                    <Typography variant="h2" color="success.main" fontWeight="bold">VERKOCHT!</Typography>
                    <Typography variant="h4">€ {currentPrice?.toFixed(2)}</Typography>
                    <Typography variant="h6">aan {buyerName}</Typography>
                </Box>
            ) : (
                // De Prijs Teller
                <Box sx={{ 
                    position: 'relative', 
                    width: 300, 
                    height: 300, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: status === "RUNNING" ? 'primary.main' : 'grey.300',
                    borderRadius: '50%',
                    boxShadow: 6,
                    mb: 4,
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

            {/* De Knop */}
            <Button 
                variant="contained" 
                color="error" 
                size="large" 
                fullWidth
                onClick={handleBuy}
                disabled={status !== "RUNNING"}
                sx={{ 
                    height: 100, 
                    fontSize: '3rem', 
                    borderRadius: 4,
                    boxShadow: status === "RUNNING" ? '0 0 30px rgba(211, 47, 47, 0.6)' : 'none',
                    transform: status === "RUNNING" ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s'
                }}
            >
                MIJN!
            </Button>
            
            {status === "RUNNING" && (
                <Typography variant="caption" sx={{ mt: 2 }}>
                    Druk snel voordat de prijs te laag is!
                </Typography>
            )}
        </Box>
      </Box>
    </Container>
  );
}