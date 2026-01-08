import { useEffect, useState, useRef } from "react";
import { 
  Container, Box, Typography, Card, CardContent, Button, 
  Grid, Divider, Chip, Paper, Switch, FormControlLabel, CircularProgress, Stack
} from "@mui/material";
import * as signalR from "@microsoft/signalr";
import StopCircleIcon from '@mui/icons-material/StopCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from "react-router-dom";
import { useNotification } from "../Contexts/NotificationContext";

// Updated Interface
interface CurrentAuctionItem {
  id: number;
  productNaam: string;
  imageUrl: string;
  startPrijs: number;
  minPrijs: number; // <--- Added
}

export default function VeilingMeesterLive() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentItem, setCurrentItem] = useState<CurrentAuctionItem | null>(null);
  const [status, setStatus] = useState<"WAITING" | "RUNNING" | "SOLD" | "TIMEOUT">("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");
  
  // Auto-Queue State
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [autoPlayTimer, setAutoPlayTimer] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const autoNextIntervalRef = useRef<number | null>(null);
  const dropDuration = 30000; 
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

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
      stopAutoNextTimer();
    };
  }, []);

  // Check for active auction on load
  useEffect(() => {
    const checkActiveAuction = async () => {
        try {
            const res = await fetch(`${baseUrl}/api/Veiling/active`);
            if (res.ok) {
                const auctionState = await res.json();
                
                if (auctionState.isRunning) {
                    const productDetails = await fetchProductDetails(auctionState.productId);
                    
                    if (productDetails) {
                        setCurrentItem({
                            id: productDetails.productID,
                            productNaam: productDetails.naam,
                            imageUrl: productDetails.imageUrl,
                            startPrijs: productDetails.startPrijs,
                            minPrijs: productDetails.minPrijs // <--- Store it
                        });

                        // FIX: Pass the fetched minPrijs
                        startClockAnimation(auctionState.startTime, productDetails.startPrijs, productDetails.minPrijs);
                        setStatus("RUNNING");
                    }
                }
            }
        } catch (error) {
            console.log("No active auction found.");
        }
    };

    checkActiveAuction();
  }, []);

  useEffect(() => {
    if (!connection) return;

    connection.on("ReceiveNewAuction", async (data: any) => {
        stopClock(); 
        stopAutoNextTimer(); 
        setStatus("RUNNING");
        setBuyerName("");

        const productDetails = await fetchProductDetails(data.productId);
        
        if (productDetails) {
            setCurrentItem({
                id: productDetails.productID,
                productNaam: productDetails.naam,
                imageUrl: productDetails.imageUrl,
                startPrijs: data.startPrijs,
                minPrijs: productDetails.minPrijs // <--- Store it
            });

            // FIX: Pass the fetched minPrijs
            startClockAnimation(data.startTime, data.startPrijs, productDetails.minPrijs);
            
            notify(`Veiling gestart: ${productDetails.naam}`, "info");
        }
    });

    connection.on("ReceiveAuctionResult", (data: any) => {
        stopClock();
        setStatus("SOLD");
        setCurrentPrice(data.price);
        setBuyerName(data.buyer);
        notify(`Verkocht aan ${data.buyer} voor €${data.price}`, "success");
    });

  }, [connection, notify]);

  // Handle Auto-Play Logic when status changes to SOLD or TIMEOUT
  useEffect(() => {
    if ((status === "SOLD" || status === "TIMEOUT") && autoPlay) {
      startAutoNextTimer();
    }
  }, [status, autoPlay]);

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

  // Updated Animation Function
  const startClockAnimation = (startTimeString: string, startPrice: number, productMinPrice: number) => {
      stopClock();
      
      const startTime = new Date(startTimeString).getTime();
      
      // FIX: Use the REAL minimum price
      const minPrice = productMinPrice; 

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
              
              // Ensure we don't drop below the absolute minimum
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

  // --- Auto Next Logic ---
  const startAutoNextTimer = () => {
    stopAutoNextTimer();
    setAutoPlayTimer(5); // 5 seconds countdown

    autoNextIntervalRef.current = window.setInterval(() => {
      setAutoPlayTimer((prev) => {
        if (prev <= 1) {
          stopAutoNextTimer();
          handleForceNext(false); // Call next without confirmation
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopAutoNextTimer = () => {
    if (autoNextIntervalRef.current) {
      clearInterval(autoNextIntervalRef.current);
      autoNextIntervalRef.current = null;
    }
    setAutoPlayTimer(0);
  };

  const handleEmergencyStop = async () => {
      notify("Noodstop functionaliteit moet nog geïmplementeerd worden in backend", "warning");
  };

  const handleForceNext = async (confirmAction: boolean = true) => {
      if(confirmAction && !confirm("Weet je zeker dat je naar het volgende item wilt?")) return;

      stopAutoNextTimer(); // Prevent double trigger

      try {
          const token = localStorage.getItem("token");
          // Use force-next as the primary trigger for "Next Item"
          await fetch(`${baseUrl}/api/Veiling/force-next`, {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}` }
          });
          notify("Volgende item aangevraagd...", "info");
      } catch(e) {
          notify("Kon item niet forceren", "error");
      }
  };

  // --- RENDER HELPERS ---
  
  const getStatusColor = () => {
      if (status === 'RUNNING') return '#e3f2fd';
      if (status === 'SOLD') return '#e8f5e9';
      if (status === 'TIMEOUT') return '#fff3e0';
      return '#f5f5f5';
  };

  const getBorderColor = () => {
      if (status === 'RUNNING') return 'primary.main';
      if (status === 'SOLD') return 'success.main';
      if (status === 'TIMEOUT') return 'warning.main';
      return 'grey.400';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/Veilingmeester')} sx={{ mb: 2 }}>
        Terug naar Dashboard
      </Button>
      
      <Grid container spacing={4}>
        {/* Left Column: Visual Display */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper 
            elevation={6} 
            sx={{ 
                p: 5, 
                textAlign: 'center', 
                bgcolor: getStatusColor(),
                minHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '4px solid',
                borderColor: getBorderColor(),
                borderRadius: '50%',
                transition: 'all 0.3s',
                position: 'relative'
            }}
          >
            {/* Status Label */}
            <Chip 
                label={status === "WAITING" ? "WACHTEN..." : status} 
                color={status === 'RUNNING' ? "primary" : (status === 'SOLD' ? "success" : (status === 'TIMEOUT' ? "warning" : "default"))} 
                sx={{ 
                    fontSize: '1.2rem', 
                    p: 2, 
                    position: 'absolute', 
                    top: 40 
                }} 
            />

            {/* Price Display */}
            <Typography variant="h6" color="textSecondary" gutterBottom sx={{ mt: 4 }}>
              {status === 'SOLD' ? 'VERKOCHTPRIJS' : 'HUIDIGE PRIJS'}
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '5rem', fontFamily: 'monospace' }}>
               € {currentPrice ? currentPrice.toFixed(2) : "0.00"}
            </Typography>
            
            {/* Buyer Info if Sold */}
            {status === 'SOLD' && (
                <Box mt={3} p={2} bgcolor="white" borderRadius={2} boxShadow={1}>
                    <Typography variant="h5" color="success.main" fontWeight="bold">
                        🎉 Verkocht aan: {buyerName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Transactie voltooid
                    </Typography>
                </Box>
            )}

             {/* Timeout Info */}
             {status === 'TIMEOUT' && (
                <Typography variant="h6" color="warning.main" mt={2}>
                    Niet verkocht (Tijd op)
                </Typography>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Controls */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h4">Live Controle</Typography>
                {/* Auto-Queue Switch */}
                <FormControlLabel
                  control={
                    <Switch 
                        checked={autoPlay} 
                        onChange={(e) => setAutoPlay(e.target.checked)} 
                        color="primary"
                    />
                  }
                  label="Automatisch Doorgaan"
                />
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box mb={4} flexGrow={1}>
                <Typography variant="overline">Huidig Item:</Typography>
                {currentItem ? (
                    <Box display="flex" gap={2} mt={1} p={2} border="1px solid #eee" borderRadius={2}>
                        {currentItem.imageUrl && (
                            <img 
                                src={currentItem.imageUrl} 
                                alt="Product" 
                                style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8 }} 
                            />
                        )}
                        <Box>
                            <Typography variant="h6">{currentItem.productNaam}</Typography>
                            <Typography variant="body2" color="textSecondary">ID: {currentItem.id}</Typography>
                            <Typography variant="body1" fontWeight="bold">Start: €{currentItem.startPrijs}</Typography>
                            <Typography variant="caption" display="block">Min: €{currentItem.minPrijs}</Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ p: 4, bgcolor: '#f9f9f9', borderRadius: 2, textAlign: 'center' }}>
                        <Typography fontStyle="italic" color="textSecondary">
                            Geen item geladen.
                        </Typography>
                    </Box>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Dynamic Action Buttons */}
              <Typography variant="overline" display="block" mb={1}>Acties</Typography>
              
              <Stack spacing={2}>
                
                {/* WAITING STATE */}
                {status === 'WAITING' && (
                    <Button 
                        variant="contained" 
                        color="success" 
                        size="large" 
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleForceNext(false)} // No confirm needed for start
                        sx={{ py: 2, fontSize: '1.1rem' }}
                    >
                        Start Veiling / Volgende
                    </Button>
                )}

                {/* RUNNING STATE */}
                {status === 'RUNNING' && (
                    <>
                        <Button 
                            variant="contained" 
                            color="error" 
                            size="large" 
                            startIcon={<StopCircleIcon />}
                            onClick={handleEmergencyStop}
                        >
                            NOODSTOP
                        </Button>
                        <Button 
                            variant="outlined" 
                            color="warning" 
                            startIcon={<SkipNextIcon />}
                            onClick={() => handleForceNext(true)}
                        >
                            Forceer Volgende (Skip)
                        </Button>
                    </>
                )}

                {/* SOLD / TIMEOUT STATE */}
                {(status === 'SOLD' || status === 'TIMEOUT') && (
                    <Box>
                        {autoPlay && autoPlayTimer > 0 ? (
                            <Button 
                                variant="contained" 
                                fullWidth 
                                color="primary" 
                                size="large"
                                onClick={() => handleForceNext(false)}
                                startIcon={<CircularProgress size={20} color="inherit" />}
                            >
                                Volgende in {autoPlayTimer}s... (Klik om nu te starten)
                            </Button>
                        ) : (
                            <Button 
                                variant="contained" 
                                fullWidth 
                                color="primary" 
                                size="large"
                                startIcon={<ArrowForwardIcon />}
                                onClick={() => handleForceNext(false)}
                                sx={{ py: 1.5, fontSize: '1.1rem' }}
                            >
                                Start Volgende Veiling
                            </Button>
                        )}
                        <Typography variant="caption" display="block" textAlign="center" mt={1} color="textSecondary">
                            Klik om direct door te gaan naar het volgende item in de wachtrij.
                        </Typography>
                    </Box>
                )}

              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}