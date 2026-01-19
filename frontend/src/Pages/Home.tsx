import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  ListItemButton,
  Paper,
  TextField,
  MenuItem,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import GavelIcon from "@mui/icons-material/Gavel";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import * as signalR from "@microsoft/signalr";
import ProductCard from "../Components/ProductCard";
import { getImageUrl } from "../Utils/ImageUtils";

// Vaste locaties voor de filter
const LOCATIES = [
  "Alle Locaties",
  "Aalsmeer",
  "Naaldwijk",
  "Rijnsburg",
  "Eelde",
  "Rhein Maas",
];

export default function Home() {
  const navigate = useNavigate();
  const [activeAuction, setActiveAuction] = useState<any>(null);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Nieuwe state voor filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Alle Locaties");

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5299";

  // 1. DATA LADEN
  useEffect(() => {
    const loadData = async () => {
      try {
        const prodRes = await fetch(`${baseUrl}/api/Product/products`);
        const allProducts = await prodRes.json();

        // Sorteer: Nieuwste producten eerst
        const sorted = allProducts.sort(
          (a: any, b: any) => b.productID - a.productID
        );
        setProducts(sorted);

        const activeRes = await fetch(`${baseUrl}/api/Veiling/active`);
        if (activeRes.ok) {
          const auction = await activeRes.json();
          setActiveAuction(auction);
          const found = allProducts.find(
            (p: any) => p.productID === auction.productId
          );
          setActiveProduct(found);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  // 2. LIVE UPDATES
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/AuctionHub`)
      .withAutomaticReconnect()
      .build();

    const startConnection = async () => {
      try {
        await connection.start();
      } catch (err) {
        console.error("SignalR fout:", err);
      }
    };
    startConnection();

    connection.on("ReceiveNewAuction", (data: any) => {
      setActiveAuction({
        productId: data.productId,
        startTime: data.startTime,
      });
      setProducts((current) => {
        const found = current.find((p) => p.productID === data.productId);
        if (found) setActiveProduct(found);
        return current;
      });
    });

    // Updated handler to remove sold items
    connection.on("ReceiveAuctionResult", (result: any) => {
      setActiveAuction(null);
      setActiveProduct(null);
      
      // Remove the sold item from the grid immediately
      setProducts((current) => current.filter(p => p.productID !== result.productId));
    });

    return () => {
      connection.stop().catch((e) => console.error(e));
    };
  }, []);

  // --- FILTERS & LOGICA ---

  // 1. Filter producten voor de lijst
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.naam
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesLocation =
      selectedLocation === "Alle Locaties" ||
      product.locatie === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  // 2. Filter voor "Vandaag op de klok" (Sidebar)
  const todaysAuctions = products.filter((product) => {
    if (!product.beginDatum) return false;
    const productDate = new Date(product.beginDatum).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return productDate === today;
  });

  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh", pb: 8 }}>
      {/* --- HERO HEADER --- */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 8,
          textAlign: "center",
          backgroundImage: activeProduct?.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${getImageUrl(activeProduct.imageUrl)})`
            : "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(https://images.unsplash.com/photo-1602615576820-ea14cf3e476a?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3Dhttps://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1920)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mb: 4,
          boxShadow: 3,
        }}
      >
        <Container maxWidth="md">
          {activeAuction && activeProduct ? (
            <>
              <Chip
                label="🔥 NU LIVE: BIED MEE!"
                color="error"
                sx={{ mb: 2, fontWeight: "bold", fontSize: "1rem", px: 2 }}
              />
              <Typography
                variant="h1"
                fontWeight="800"
                gutterBottom
                sx={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
              >
                {activeProduct.naam}
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                Huidige prijs is dynamisch. Wacht niet te lang!
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<GavelIcon />}
                onClick={() => navigate(`/klok/${activeProduct.productID}`)}
                sx={{
                  px: 5,
                  py: 1.5,
                  fontSize: "1.2rem",
                  borderRadius: 50,
                  boxShadow: "0 4px 14px 0 rgba(0,0,0,0.4)",
                }}
              >
                Ga naar Live Veiling
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h1" fontWeight="bold" gutterBottom>
                Welkom bij Bloemenveiling
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                Het nr. 1 platform voor verse handel.
              </Typography>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                onClick={() =>
                  document
                    .getElementById("aanbod")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Bekijk Aanbod
              </Button>
            </>
          )}
        </Container>
      </Box>

      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* --- LINKERKANT: ZOEKBALK & PRODUCTEN (9 kolommen) --- */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Box
              id="aanbod"
              mb={4}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Typography variant="h2" fontWeight="bold" color="text.primary">
                Actueel Aanbod
              </Typography>

              {/* Zoek & Filter Sectie */}
              <Box
                display="flex"
                gap={2}
                bgcolor="white"
                p={1}
                borderRadius={2}
                boxShadow={1}
              >
                <TextField
                  placeholder="Zoek product..."
                  size="small"
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputProps={{ 'aria-label': 'Zoek product' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150 }}
                  SelectProps={{
                    native: false,
                    inputProps: { 'aria-label': 'Filter op locatie' }
                  }}
                >
                  {LOCATIES.map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.productID}>
                    <ProductCard
                      product={{
                        id: product.productID,
                        name: product.naam,
                        price: product.startPrijs,
                        imageUrl: product.imageUrl,
                        locatie: product.locatie,
                        aantal: product.aantal,
                      }}
                    />
                  </Grid>
                ))
              ) : (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      Geen producten gevonden die voldoen aan je filters.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* --- RECHTERKANT: SIDEBAR (3 kolommen) --- */}
          <Grid size={{ xs: 12, md: 3 }}>
            {/* Widget 1: Vandaag */}
            <Paper
              elevation={2}
              sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}
            >
              <Box
                bgcolor="primary.main"
                p={2}
                color="white"
                display="flex"
                alignItems="center"
                gap={1}
              >
                <CalendarTodayIcon />
                <Typography variant="h6" fontWeight="bold">
                  Vandaag op de klok
                </Typography>
              </Box>
              <List sx={{ p: 0 }}>
                {todaysAuctions.length > 0 ? (
                  todaysAuctions.map((product, index) => (
                    <Box key={product.productID}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() =>
                            navigate(`/product/${product.productID}`)
                          }
                        >
                          <ListItemAvatar>
                            <Avatar
                              src={getImageUrl(product.imageUrl)}
                              variant="rounded"
                              alt={product.naam}
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={product.naam}
                            secondary={
                              <Typography
                                variant="caption"
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                              >
                                <LocationOnIcon sx={{ fontSize: 14 }} />{" "}
                                {product.locatie || "Onbekend"}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < todaysAuctions.length - 1 && (
                        <Divider component="li" />
                      )}
                    </Box>
                  ))
                ) : (
                  <Box p={3} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Geen veilingen gepland voor vandaag.
                    </Typography>
                  </Box>
                )}
              </List>
              {todaysAuctions.length > 0 && (
                <Box p={2} bgcolor="grey.50">
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => setSearchTerm("")}
                  >
                    Toon alles
                  </Button>
                </Box>
              )}
            </Paper>

            {/* Widget 2: Informatie / Call to Action
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: "#e3f2fd",
                border: "1px solid #90caf9",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                color="primary.main"
                fontWeight="bold"
              >
                Zelf Verkopen?
              </Typography>
              <Typography variant="body2" paragraph>
                Heb je verse producten die je wilt aanbieden op onze veiling?
                Meld je aan als verkoper!
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => navigate("/verkoper")}
              >
                Naar Dashboard
              </Button>
            </Paper> */}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}