import { useEffect, useState, useRef } from "react";
import { 
  Container, Box, Typography, Card, CardContent, Button, 
  Grid, Divider, Chip, Paper, CircularProgress
} from "@mui/material";
import * as signalR from "@microsoft/signalr";
import StopCircleIcon from '@mui/icons-material/StopCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from "react-router-dom";
import { useNotification } from "../Contexts/NotificationContext";

// Types
interface CurrentAuctionItem {
  id: number;
  productNaam: string;
  imageUrl: string;
  startPrijs: number;
}

export default function VeilingMeesterLive() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  // State
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentItem, setCurrentItem] = useState<CurrentAuctionItem | null>(null);
  const [status, setStatus] = useState<"WAITING" | "RUNNING" | "SOLD" | "TIMEOUT">("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");

  // Refs for timer logic
  const timerRef = useRef<number | null>(null);
  const dropDuration = 30000; // 30 seconds
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // 1. SIGNALR CONNECTION
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/AuctionHub`)
      .withAutomaticReconnect()
      .build();

    let isMounted = true;

    const startConnection = async () => {
      try {
        await newConnection.start();
        if (isMounted) {
          console.log("Veilingmeester Connected");
          setConnection(newConnection);
        } else {
          newConnection.stop();
        }
      } catch (err) {
        if (isMounted) console.error("SignalR Connection Error: ", err);
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      if (newConnection.state === signalR.HubConnectionState.Connected) {
          newConnection.stop().catch(() => {});
      }
      stopClock();
    };
  }, []);

  // 2. CHECK ACTIVE AUCTION ON LOAD (The Fix)
  useEffect(() => {
    const checkActiveAuction = async () => {
        try {
            // A. Ask backend if anything is running
            const res = await fetch(`${baseUrl}/api/Veiling/active`);
            if (res.ok) {
                const auctionState = await res.json();
                
                // B. If running, fetch the product details
                if (auctionState.isRunning) {
                    console.log("Found active auction:", auctionState);
                    const productDetails = await fetchProductDetails(auctionState.productId);
                    
                    if (productDetails) {
                        setCurrentItem({
                            id: productDetails.productID,
                            productNaam: productDetails.naam,
                            imageUrl: productDetails.imageUrl,
                            startPrijs: productDetails.startPrijs // Note: Ensure backend sends startPrijs in product details
                        });

                        // C. Sync the clock
                        startClockAnimation(auctionState.startTime, productDetails.startPrijs);
                        setStatus("RUNNING");
                    }
                }
            }
        } catch (error) {
            console.log("No active auction found or error fetching.");
        }
    };

    checkActiveAuction();
  }, []); // Run once on mount

  // 3. EVENT LISTENERS
  useEffect(() => {
    if (!connection) return;

    // EVENT: START
    connection.on("ReceiveNewAuction", async (data: any) => {
        console.log("Nieuwe veiling gestart (Event):", data);
        stopClock(); 

        const productDetails = await fetchProductDetails(data.productId);
        
        if (productDetails) {
            setCurrentItem({
                id: productDetails.productID,
                productNaam: productDetails.naam,
                imageUrl: productDetails.imageUrl,
                startPrijs: data.startPrijs
            });

            startClockAnimation(data.startTime, data.startPrijs);
            setStatus("RUNNING");
            notify(`Veiling gestart: ${productDetails.naam}`, "info");
        }
    });

    // EVENT: RESULT (SOLD)
    connection.on("ReceiveAuctionResult", (data: any) => {
        console.log("Veiling resultaat:", data);
        stopClock();
        setStatus("SOLD");
        setCurrentPrice(data.price);
        setBuyerName(data.buyer);
        notify(`Verkocht aan ${data.buyer} voor €${data.price}`, "success");
    });

  }, [connection, notify]);

  // 4. HELPER: Fetch Product Data
  const fetchProductDetails = async (id: number) => {
      try {
          const res = await fetch(`${baseUrl}/api/Product/products`);
          if (res.ok) {
              const allProducts = await res.json();
              return allProducts.find((p: any) => p.productID === id);
          }
      } catch (e) {
          console.error("Failed to fetch product details", e);
      }
      return null;
  };

  // 5. HELPER: Clock Animation
  const startClockAnimation = (startTimeString: string, startPrice: number) => {
      stopClock();
      
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
              
              // Prevent displaying negative/weird numbers if sync is off
              if (newPrice < minPrice) setCurrentPrice(minPrice);
              else setCurrentPrice(newPrice);
          }
      }, 50); 
  };

  const stopClock = () => {
      if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
      }
  };

  // 6. BUTTON ACTIONS
  const handleEmergencyStop = async () => {
      notify("Noodstop functionaliteit moet nog geïmplementeerd worden in backend", "warning");
  };

  const handleForceNext = async () => {
      notify("Volgende item forceren...", "info");
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/Veilingmeester')} sx={{ mb: 2 }}>
        Terug naar Dashboard
      </Button>
      
      <Grid container spacing={4}>
        {/* LEFT: MONITOR */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper 
            elevation={6} 
            sx={{ 
                p: 5, 
                textAlign: 'center', 
                bgcolor: status === 'RUNNING' ? '#e3f2fd' : (status === 'SOLD' ? '#e8f5e9' : '#f5f5f5'),
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '4px solid',
                borderColor: status === 'RUNNING' ? 'primary.main' : (status === 'SOLD' ? 'success.main' : 'grey.400'),
                borderRadius: '50%',
                transition: 'all 0.3s'
            }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              HUIDIGE PRIJS
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '5rem', fontFamily: 'monospace' }}>
               € {currentPrice ? currentPrice.toFixed(2) : "0.00"}
            </Typography>
            
            <Chip 
                label={status} 
                color={status === 'RUNNING' ? "primary" : (status === 'SOLD' ? "success" : "default")} 
                sx={{ mt: 2, fontSize: '1.2rem', p: 2 }} 
            />
            
            {status === 'SOLD' && (
                <Typography variant="h6" color="success.main" mt={2}>
                    Koper: {buyerName}
                </Typography>
            )}
          </Paper>
        </Grid>

        {/* RIGHT: CONTROLS */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>Live Controle</Typography>
              <Divider sx={{ mb: 3 }} />

              <Box mb={4}>
                <Typography variant="overline">Nu op de klok:</Typography>
                {currentItem ? (
                    <Box display="flex" gap={2} mt={1}>
                        {currentItem.imageUrl && (
                            <img 
                                src={currentItem.imageUrl} 
                                alt="Product" 
                                style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 8, border: '1px solid #ddd' }} 
                            />
                        )}
                        <Box>
                            <Typography variant="h5">{currentItem.productNaam}</Typography>
                            <Typography variant="body1">Startprijs: €{currentItem.startPrijs}</Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
                        <Typography fontStyle="italic" color="textSecondary">
                            Wachten op start veiling...
                        </Typography>
                    </Box>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="overline" color="error">Gevaarlijke Zone</Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <Button 
                    variant="contained" 
                    color="error" 
                    size="large" 
                    startIcon={<StopCircleIcon />}
                    onClick={handleEmergencyStop}
                    fullWidth
                >
                    NOODSTOP VEILING
                </Button>
                
                <Button 
                    variant="outlined" 
                    color="warning" 
                    size="large" 
                    startIcon={<SkipNextIcon />}
                    onClick={handleForceNext}
                    fullWidth
                >
                    Forceer Volgende Item
                </Button>
              </Box>

            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}