import { useParams } from "react-router-dom";
import { Box, Container, Typography, LinearProgress, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchProducts } from "../Data/Products";

export default function Klok() {
  const { id } = useParams<{ id: string }>();
  const { products, loading } = fetchProducts();

  const product = !loading
    ? products.find(p => p.id.toString() === id)
    : undefined;

  // Auction settings (dynamic fallback values)
  const dropDuration = 30000;  // 30 seconds
  const dropInterval = 300;    // update every 300ms

  // Auction state
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize auction ONLY when product becomes available
  useEffect(() => {
    if (!product) return;

    const max = product.price;
    //const min = product.price * 0.3;

    setCurrentPrice(max);  // set initial price after product loads
    setIsRunning(true);    // start auction
  }, [product]);

  // Countdown effect
  useEffect(() => {
    if (!product || currentPrice === null || !isRunning) return;

    const max = product.price;
    const min = product.price * 0.3;

    const totalSteps = Math.floor(dropDuration / dropInterval);
    const priceStep = (max - min) / totalSteps;

    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        if (prev === null) return null;

        const next = prev - priceStep;

        if (next <= min) {
          clearInterval(interval);
          setIsRunning(false);
          return min;
        }

        return next;
      });
    }, dropInterval);

    return () => clearInterval(interval);
  }, [product, currentPrice, isRunning]);

  // UI handling
  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;
  if (currentPrice === null) return <div>Starting auction...</div>;

  const max = product.price;
  const min = product.price * 0.3;
  const progress = ((currentPrice - min) / (max - min)) * 100;

  return (
    <Container sx={{ py: 4 }}>
      <Box display="flex" gap={6} flexWrap="wrap" alignItems="center" justifyContent="center">

        {/* Product Info */}
        <Box flex={1} minWidth={300}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ maxWidth: "100%", borderRadius: 8 }}
          />
          <Typography variant="h4" gutterBottom>{product.name}</Typography>
          <Typography variant="body1">
            {`Dit is een ${product.name}. Perfect voor uw tuin!`}
          </Typography>
        </Box>

        {/* Auction Clock */}
        <Box flex={1} minWidth={300}>
          <Typography variant="h5" gutterBottom>
            Huidige prijs: €{currentPrice.toFixed(2)}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 25,
              borderRadius: 2,
              mb: 3,
              "& .MuiLinearProgress-bar": {
                transition: `width ${dropInterval}ms linear`,
              },
            }}
          />

          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="body2">Max: €{max.toFixed(2)}</Typography>
            <Typography variant="body2">Min: €{min.toFixed(2)}</Typography>
          </Box>

          <Button
            variant="contained"
            onClick={() => setIsRunning(false)}
            disabled={!isRunning}
            fullWidth
          >
            Bied
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
