import { useEffect, useState } from "react";
import { 
  Container, Box, Typography, Card, CardContent, Button, 
  Grid, Divider, Chip, Paper,
} from "@mui/material";
import { HubConnectionBuilder, LogLevel, HubConnection } from "@microsoft/signalr";
import StopCircleIcon from '@mui/icons-material/StopCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from "react-router-dom";
import { useNotification } from "../Contexts/NotificationContext"; // Your new context

// Types for our state
interface CurrentAuctionItem {
  productNaam: string;
  imageUrl: string;
  startPrijs: number;
}

export default function VeilingMeesterLive() {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [currentItem, setCurrentItem] = useState<CurrentAuctionItem | null>(null);
  const [status, setStatus] = useState<string>("Wachten op start...");
  
  const { notify } = useNotification();
  const navigate = useNavigate();

  // 1. Initialize SignalR Connection (Same as KlokPage)
  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl("http://localhost:5299/auctionHub") // Adjust port if needed
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  // 2. Setup Listeners
  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log("Auctioneer connected to Hub");
          
          // Listen for price updates
          connection.on("ReceivePriceUpdate", (newPrice: number) => {
            setPrice(newPrice);
            setStatus("Actief");
          });

          // Listen for new product start
          connection.on("StartNewAuction", (product: any) => {
            setCurrentItem({
                productNaam: product.name,
                imageUrl: product.imageUrl,
                startPrijs: product.price
            });
            setPrice(product.price);
            setStatus("Veiling loopt");
            notify(`Gestart: ${product.name}`, "info", "top-right");
          });

          // Listen for end
          connection.on("AuctionEnded", (message: string) => {
            setStatus(`Afgelopen: ${message}`);
            notify(message, "warning", "top-center");
          });
        })
        .catch(e => console.error("Connection failed: ", e));
    }
  }, [connection, notify]);

  // 3. Admin Actions
  const handleEmergencyStop = async () => {
    // This would call an endpoint like /api/Veiling/stop
    const token = localStorage.getItem("token");
    try {
        await fetch('http://localhost:5299/api/Veiling/stop', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        notify("NOODSTOP GEACTIVEERD", "error", "top-center");
    } catch (e) {
        console.error(e);
        notify("Kon niet stoppen", "error");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/Veilingmeester')} sx={{ mb: 2 }}>
        Terug naar Dashboard
      </Button>
      
      <Grid container spacing={4}>
        {/* LEFT COLUMN: THE CLOCK MONITOR */}
        {/* FIX: Use size={{ ... }} instead of xs={...} */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper 
            elevation={6} 
            sx={{ 
                p: 5, 
                textAlign: 'center', 
                bgcolor: status === 'Actief' ? '#e3f2fd' : '#f5f5f5',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                border: '4px solid',
                borderColor: status === 'Actief' ? 'primary.main' : 'grey.400',
                borderRadius: '50%' 
            }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              HUIDIGE PRIJS
            </Typography>
            <Typography variant="h1" sx={{ fontWeight: 'bold', fontSize: '6rem' }}>
              € {price.toFixed(2)}
            </Typography>
            <Chip 
                label={status.toUpperCase()} 
                color={status === 'Actief' ? "success" : "default"} 
                sx={{ mt: 2 }} 
            />
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: CONTROLS & INFO */}
        {/* FIX: Use size={{ ... }} instead of xs={...} */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>Live Controle</Typography>
              <Divider sx={{ mb: 3 }} />

              {/* Current Product Info */}
              <Box mb={4}>
                <Typography variant="overline">Nu op de klok:</Typography>
                {currentItem ? (
                    <Box display="flex" gap={2} mt={1}>
                        {currentItem.imageUrl && (
                            <img 
                                src={currentItem.imageUrl} 
                                alt="Product" 
                                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} 
                            />
                        )}
                        <Box>
                            <Typography variant="h5">{currentItem.productNaam}</Typography>
                            <Typography variant="body1">Startprijs: €{currentItem.startPrijs}</Typography>
                        </Box>
                    </Box>
                ) : (
                    <Typography fontStyle="italic" color="textSecondary">
                        Wachten op eerste item...
                    </Typography>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* ACTION BUTTONS */}
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