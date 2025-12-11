import { useParams, useNavigate } from "react-router-dom"; // useNavigate toegevoegd
import { Box, Container, Typography, Button, Grid } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";

export default function Klok() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate(); // Om te switchen van pagina
  
  const [product, setProduct] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<"WAITING" | "RUNNING" | "SOLD" | "TIMEOUT">("WAITING");
  const [buyerName, setBuyerName] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  // 1. SIGNALR GLOBAL LISTENER (Luister naar Queue updates)
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/AuctionHub`)
        .withAutomaticReconnect()
        .build();

    connection.start().then(() => console.log("SignalR Connected"));

    // Als server zegt: "Nieuwe veiling gestart voor ID X"
    connection.on("ReceiveNewAuction", (data: any) => {
        // Navigeer automatisch naar de nieuwe klok pagina!
        navigate(`/klok/${data.productId}`);
        // Reset state voor het nieuwe product
        setStatus("RUNNING");
        setCurrentPrice(data.startPrijs);
        startClockAnimation(data.startTime, data.startPrijs);
    });

    // Als server zegt: "Product X is verkocht"
    connection.on("ReceiveAuctionResult", (data: any) => {
        if (data.productId.toString() === id) { // Check of het over ONS product gaat
            stopClock();
            setStatus("SOLD");
            setBuyerName(data.buyer);
            setCurrentPrice(data.price);
        }
    });

    return () => { connection.stop(); stopClock(); };
  }, [id, navigate]);

  // 2. PRODUCT DATA OPHALEN
  useEffect(() => {
      const loadProduct = async () => {
          try {
              const res = await fetch(`${baseUrl}/api/Product/products`);
              const data = await res.json();
              const found = data.find((p:any) => p.productID.toString() === id);
              if(found) {
                  setProduct(found);
                  // Check of hij stiekem al loopt (page refresh)
                  const statRes = await fetch(`${baseUrl}/api/Veiling/status/${id}`);
                  const state = await statRes.json();
                  if(state.isRunning) startClockAnimation(state.startTime, found.startPrijs);
                  if(state.isSold) { setStatus("SOLD"); setCurrentPrice(state.finalPrice); setBuyerName(state.buyerName); }
              }
          } catch(e) {}
      };
      if(id) loadProduct();
  }, [id]);

  // Hulpfuncties voor klok animatie
  const startClockAnimation = (startTimeStr: string, startPrice: number) => {
      if(timerRef.current) clearInterval(timerRef.current);
      const startTime = new Date(startTimeStr).getTime();
      const dropDuration = 30000;
      const minPrice = startPrice * 0.3;

      timerRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          if(elapsed >= dropDuration) {
              setCurrentPrice(minPrice); setStatus("TIMEOUT"); stopClock();
          } else {
              const progress = elapsed / dropDuration;
              setCurrentPrice(startPrice - (progress * (startPrice - minPrice)));
          }
      }, 50);
  };
  const stopClock = () => { if(timerRef.current) clearInterval(timerRef.current); };

  const handleBuy = async () => {
      if(status !== "RUNNING") return;
      stopClock();
      const token = localStorage.getItem("token");
      await fetch(`${baseUrl}/api/Veiling/koop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId: Number(id), buyerName: "Ik", price: currentPrice })
      });
  };

  if(!product) return <Typography>Wachten op veiling...</Typography>;

  return (
    <Container sx={{py:4, textAlign: 'center'}}>
        <Typography variant="h3">{product.naam}</Typography>
        {status === "RUNNING" && <Typography variant="h1">€ {currentPrice?.toFixed(2)}</Typography>}
        {status === "SOLD" && <Typography variant="h2" color="success.main">VERKOCHT aan {buyerName}!</Typography>}
        <Button variant="contained" color="error" size="large" onClick={handleBuy} disabled={status !== "RUNNING"} sx={{mt:4, fontSize: '2rem'}}>MIJN!</Button>
    </Container>
  );
}