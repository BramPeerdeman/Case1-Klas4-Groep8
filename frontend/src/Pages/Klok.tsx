import { useParams } from "react-router-dom";
import { Box, Container, Typography, Button, Grid } from "@mui/material"; // Chip weggehaald als niet gebruikt
import { useEffect, useState, useRef } from "react";

// We halen fetchProducts niet meer uit Data, we doen het live via API!

export default function Klok() {
  const { id } = useParams<{ id: string }>();
  
  // State
  const [product, setProduct] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<"WAITING" | "RUNNING" | "SOLD" | "TIMEOUT">("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const pollingRef = useRef<number | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  const dropDuration = 30000; // 30 seconden looptijd

  // 1. OPHALEN PRODUCT GEGEVENS (Live van API)
  useEffect(() => {
    const fetchProductData = async () => {
        try {
            // We halen de lijst op (of als je een endpoint hebt voor 1 product: /api/Product/product/{id})
            const response = await fetch(`${baseUrl}/api/Product/products`);
            if (response.ok) {
                const data = await response.json();
                // Zoek het juiste product in de lijst
                const found = data.find((p: any) => p.productID.toString() === id);
                
                if (found) {
                    setProduct(found);
                    // LET OP: Gebruik de veldnamen van je C# API (startPrijs, niet price)
                    setCurrentPrice(found.startPrijs); 
                }
            }
        } catch (error) {
            console.error("Fout bij laden product", error);
        }
    };

    if (id) {
        fetchProductData();
    }
  }, [id]);

  // 2. POLLING: Vraag elke seconde aan de server wat de status is
  useEffect(() => {
    if (!product || status === "SOLD" || status === "TIMEOUT") return;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${baseUrl}/api/Auction/status/${id}`);
            if (res.ok) {
                const serverState = await res.json();
                
                // Scenario A: Veiling is verkocht
                if (serverState.isSold) {
                    setStatus("SOLD");
                    setBuyerName(serverState.buyerName || "Iemand");
                    setCurrentPrice(serverState.finalPrice);
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                } 
                // Scenario B: Veiling is bezig (RUNNING)
                else if (serverState.isRunning) {
                    // Als wij lokaal nog op 'WAITING' staan, moeten we starten!
                    // We gebruiken product.startPrijs
                    syncClock(serverState.startTime, product.startPrijs);
                }
            }
        } catch (err) {
            console.error("Verbinding met server verbroken...");
        }
    };

    pollingRef.current = window.setInterval(checkStatus, 1000);

    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, product, status]); 


  // Hulpfunctie: Bereken de huidige prijs
  const syncClock = (startTimeString: string, startPrice: number) => {
      const startTime = new Date(startTimeString).getTime();
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= dropDuration) {
          setStatus("TIMEOUT");
          setCurrentPrice(startPrice * 0.3);
          return;
      }

      setStatus("RUNNING");
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      const minPrice = startPrice * 0.3;
      
      timerRef.current = window.setInterval(() => {
          const currentElapsed = Date.now() - startTime;
          
          if (currentElapsed >= dropDuration) {
              setStatus("TIMEOUT");
              setCurrentPrice(minPrice);
              if (timerRef.current) clearInterval(timerRef.current);
              return;
          }

          const progress = currentElapsed / dropDuration;
          const newPrice = startPrice - (progress * (startPrice - minPrice));
          setCurrentPrice(newPrice);

      }, 50);
  };


  // 3. KOPEN ACTIE
  const buyProduct = async () => {
      if (status !== "RUNNING" || !currentPrice) return;

      if (timerRef.current) clearInterval(timerRef.current);
      
      try {
        const response = await fetch(`${baseUrl}/api/Auction/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: Number(id),
                buyerName: "Klant 1", 
                price: currentPrice
            })
        });

        if (response.ok) {
            setStatus("SOLD");
            setBuyerName("U"); 
        } else {
            alert("Iemand anders was net iets sneller!");
        }
      } catch (err) {
          console.error("Fout bij bieden", err);
      }
  };


  // --- RENDER ---
  if (!product || currentPrice === null) return <Typography sx={{p:4}}>Product laden...</Typography>;

  const max = product.startPrijs; // Aangepast naar startPrijs
  const min = product.startPrijs * 0.3;
  const percentage = Math.max(0, ((currentPrice - min) / (max - min)) * 100);
  
  const clockSize = 400;     
  const center = clockSize / 2;
  const radius = (clockSize / 2) - 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let circleColor = "#4caf50";
  if (percentage < 60) circleColor = "#ff9800";
  if (percentage < 30) circleColor = "#f44336";

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={4} alignItems="center">
        {/* Let op: xs en md props gebruiken ipv size={{...}} tenzij je MUI v6 gebruikt */}
        <Grid size={{ xs:12, md:6}}>
            <img 
                src={product.imageUrl} 
                alt={product.naam}
                style={{width: '100%', borderRadius: 8, maxHeight: 400, objectFit: 'contain'}} 
            />
            {/* naam ipv name */}
            <Typography variant="h3" mt={2}>{product.naam}</Typography> 
            <Typography variant="h6" color="text.secondary">Startprijs: €{product.startPrijs}</Typography>
        </Grid>

        <Grid size={{ xs:12, md:6}} display="flex" flexDirection="column" alignItems="center">
            <Box position="relative" display="inline-flex" justifyContent="center" alignItems="center">
              <svg width={clockSize} height={clockSize} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={center} cy={center} r={radius} stroke="#e0e0e0" strokeWidth={20} fill="transparent" />
                <circle
                  cx={center} cy={center} r={radius}
                  stroke={status === "SOLD" ? "#2196f3" : circleColor}
                  strokeWidth={20}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <Box position="absolute" textAlign="center">
                 {status === "WAITING" && <Typography variant="h5" color="text.secondary">Wachten op<br/>Veilingmeester...</Typography>}
                 {status === "SOLD" && (
                    <>
                        <Typography variant="h4" color="primary" fontWeight="bold">VERKOCHT!</Typography>
                        <Typography variant="h6">aan {buyerName}</Typography>
                        <Typography variant="h4">€{currentPrice.toFixed(2)}</Typography>
                    </>
                 )}
                 {(status === "RUNNING" || status === "TIMEOUT") && (
                     <>
                        <Typography variant="h2" fontWeight="bold">€{currentPrice.toFixed(0)}</Typography>
                        <Typography variant="h5">,{(currentPrice % 1).toFixed(2).substring(2)}</Typography>
                     </>
                 )}
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              color="error"
              fullWidth
              disabled={status !== "RUNNING"}
              onClick={buyProduct}
              sx={{ mt: 4, height: 80, fontSize: "2rem", borderRadius: 4, boxShadow: status === "RUNNING" ? "0 0 20px rgba(244, 67, 54, 0.5)" : "none" }}
            >
              MIJN!
            </Button>
            
        </Grid>
      </Grid>
    </Container>
  );
}