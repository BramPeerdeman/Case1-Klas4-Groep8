import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "../Hooks/usePageTitle";
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Alert,
} from "@mui/material";
import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "../Contexts/AuthContext";
import { getImageUrl } from "../Utils/ImageUtils";

// Interfaces for the History API response
interface PriceRecord {
  date: string;
  price: number;
}

interface MarketPriceRecord extends PriceRecord {
  sellerId: string;
}

interface HistoryData {
  productName: string;
  supplierId: string;
  supplierHistory: {
    averagePrice: number;
    records: PriceRecord[];
  };
  marketHistory: {
    averagePrice: number;
    records: MarketPriceRecord[];
  };
}

export default function Klok() {
  usePageTitle("Klok Veiling");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [product, setProduct] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "WAITING" | "RUNNING" | "SOLD" | "TIMEOUT"
  >("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");

  // State for Quantity
  const [quantity, setQuantity] = useState<number>(1);
  const [soldAmount, setSoldAmount] = useState<number>(0);

  // State for History Modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const timerRef = useRef<number | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5299";
  //   const dropDuration = 30000;

  const startClockAnimation = (startTimeString: string, startPrice: number, productMinPrice: number) => {
    setStatus("RUNNING");
    setCurrentPrice(startPrice);
  };

  const stopClock = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 1. SIGNALR CONNECTION & LISTENERS
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/AuctionHub`)
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => console.log("SignalR Connected"))
      .catch((err) => console.error("SignalR Connection Error: ", err));

    connection.on("ReceiveNewAuction", (data: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (id === data.productId.toString()) {
        window.location.reload();
      } else {
        navigate(`/klok/${data.productId}`);
      }
    });

    // --- DEZE REGEL IS BELANGRIJK ---
    connection.on("PrijsUpdate", (newPrice: number) => {
      // De server stuurt elke 100ms de prijs. Wij tonen die direct.
      setCurrentPrice(newPrice);
      setStatus("RUNNING");
    });

    connection.on("ReceiveAuctionResult", (data: any) => {
      if (id && data.productId.toString() === id) {
        stopClock();
        setStatus("SOLD");
        setBuyerName(data.buyer);
        setCurrentPrice(data.price);
        setSoldAmount(data.amount || 1);
      }
    });

    connectionRef.current = connection;
    return () => {
      connection.stop();
      stopClock();
    };
  }, [id, navigate]);

  // 2. LOAD PRODUCT DATA
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
          setQuantity(found.aantal);

          const statusRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
          if (statusRes.ok) {
            const serverState = await statusRes.json();

            if (serverState.isSold) {
              setStatus("SOLD");
              setBuyerName(serverState.buyerName);
              setCurrentPrice(serverState.finalPrice);
            } else if (serverState.isRunning) {
              // FIX: Pass found.minPrijs to the animation
              startClockAnimation(
                serverState.startTime,
                found.startPrijs,
                found.minPrijs
              );
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

  // 4. BUY ACTION
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: Number(id),
          buyerName: myName,
          price: currentPrice,
          buyerId: user?.sub,
          aantal: quantity,
        }),
      });

      if (!response.ok) {
        console.warn("Koop mislukt");
      }
    } catch (e) {
      console.error("Fout bij kopen", e);
    }
  };

  // History Handlers
  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    if (!historyData) {
      setLoadingHistory(true);
      try {
        const res = await fetch(`${baseUrl}/api/History/${id}`);
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
        }
      } catch (e) {
        console.error("Fout bij laden historie", e);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleCloseHistory = () => {
    setHistoryOpen(false);
  };

  if (!id || !product) return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={4}
        alignItems="center"
        justifyContent="center"
      >
        {/* Left Side: Product Info */}
        <Box flex={1}>
          <Card elevation={4}>
            <CardMedia
              component="img"
              height="400"
              image={getImageUrl(product.imageUrl)}
              alt={product.naam}
              sx={{ objectFit: "contain", p: 2, bgcolor: "#f5f5f5" }}
            />
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {product.naam}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {product.beschrijving}
              </Typography>
              <Box mt={2} display="flex" justifyContent="space-between">
                <Typography variant="h6">
                  Startprijs: € {product.startPrijs}
                </Typography>
                <Typography variant="h6" color="primary">
                  Voorraad: {product.aantal} stuks
                </Typography>
              </Box>

              <Box mt={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleOpenHistory}
                >
                  Prijshistorie bekijken
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right Side: Clock & Controls */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          textAlign="center"
        >
          {status === "WAITING" && (
            <Typography variant="h3" color="warning.main">
              Klaarzetten...
            </Typography>
          )}
          {status === "TIMEOUT" && (
            <Typography variant="h3" color="error">
              Niet Verkocht
            </Typography>
          )}

          {status === "SOLD" ? (
            <Box
              sx={{
                p: 4,
                border: "4px solid green",
                borderRadius: 4,
                mb: 4,
                bgcolor: "#e8f5e9",
              }}
            >
              <Typography variant="h2" color="success.main" fontWeight="bold">
                VERKOCHT!
              </Typography>
              <Typography variant="h4">€ {currentPrice?.toFixed(2)}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>
                {soldAmount} stuks aan {buyerName}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                position: "relative",
                width: 300,
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: status === "RUNNING" ? "primary.main" : "grey.300",
                borderRadius: "50%",
                boxShadow: 6,
                mb: 4,
                transition: "background-color 0.3s",
              }}
            >
              <Typography variant="h1" color="white" fontWeight="bold">
                {currentPrice ? `€ ${Math.floor(currentPrice)}` : "€ -"}
                <Typography
                  component="span"
                  variant="h3"
                  sx={{ verticalAlign: "super" }}
                >
                  ,
                  {currentPrice
                    ? (currentPrice % 1).toFixed(2).substring(2)
                    : "--"}
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
                if (!isNaN(val))
                  setQuantity(Math.min(Math.max(1, val), product.aantal));
              }}
              disabled={status !== "RUNNING"}
              InputProps={{ inputProps: { min: 1, max: product.aantal } }}
              sx={{ width: 100, bgcolor: "white", borderRadius: 1 }}
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
                height: 56,
                fontSize: "1.5rem",
                borderRadius: 2,
                boxShadow:
                  status === "RUNNING"
                    ? "0 0 30px rgba(211, 47, 47, 0.6)"
                    : "none",
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

      {/* Price History Dialog */}
      <Dialog
        open={historyOpen}
        onClose={handleCloseHistory}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Prijshistorie: {product.naam}</DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : historyData ? (
            <Grid container spacing={4}>
              {/* Left Column: Supplier History */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Deze aanbieder (Laatste 10)
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Gemiddelde: €{" "}
                  {historyData.supplierHistory.averagePrice?.toFixed(2) || "-"}
                </Alert>
                <List dense sx={{ bgcolor: "background.paper" }}>
                  {historyData.supplierHistory.records.length > 0 ? (
                    historyData.supplierHistory.records.map((rec, i) => (
                      <div key={i}>
                        <ListItem>
                          <ListItemText
                            primary={`€ ${rec.price.toFixed(2)}`}
                            secondary={new Date(rec.date).toLocaleString()}
                          />
                        </ListItem>
                        <Divider component="li" />
                      </div>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="Geen historie gevonden." />
                    </ListItem>
                  )}
                </List>
              </Grid>

              {/* Right Column: Market History */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom color="secondary">
                  Markt Totaal (Laatste 10)
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Marktgemiddelde: €{" "}
                  {historyData.marketHistory.averagePrice?.toFixed(2) || "-"}
                </Alert>
                <List dense sx={{ bgcolor: "background.paper" }}>
                  {historyData.marketHistory.records.length > 0 ? (
                    historyData.marketHistory.records.map((rec, i) => (
                      <div key={i}>
                        <ListItem>
                          <ListItemText
                            primary={`€ ${rec.price.toFixed(2)}`}
                            secondary={
                              <>
                                {new Date(rec.date).toLocaleString()} <br />
                                <Typography variant="caption" component="span">
                                  Verkoper: {rec.sellerId || "Onbekend"}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </div>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="Geen markthistorie gevonden." />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          ) : (
            <Typography color="error">Kan historie niet laden.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory}>Sluiten</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
