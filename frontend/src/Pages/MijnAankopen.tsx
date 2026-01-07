import { useEffect, useState } from "react";
import { Container, Typography, Grid, Card, CardContent, CardMedia, Box, Chip, CircularProgress, Alert } from "@mui/material";
import EventIcon from '@mui/icons-material/Event';
import EuroIcon from '@mui/icons-material/Euro';

// Simpele interface voor wat we verwachten
interface Aankoop {
  productID: number;
  naam: string;
  imageUrl: string;
  beschrijving: string;
  eindprijs: number;
  verkoopDatum: string;
}

export default function MijnAankopen() {
  const [aankopen, setAankopen] = useState<Aankoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAankopen = async () => {
      try {
        const token = localStorage.getItem("token");
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

        const response = await fetch(`${baseUrl}/api/Product/geschiedenis`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            setAankopen(data);
        } else {
            // Als de backend 401 geeft, is het token verlopen
            if(response.status === 401) setError("U bent niet ingelogd.");
            else setError("Kon geschiedenis niet ophalen.");
        }
      } catch (err) {
        console.error(err);
        setError("Fout bij verbinden met server.");
      } finally {
        setLoading(false);
      }
    };

    fetchAankopen();
  }, []);

  if (loading) return <Container sx={{mt: 4, textAlign: 'center'}}><CircularProgress /></Container>;

  if (error) return <Container sx={{mt: 4}}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{mb: 4}}>
         🛍️ Mijn Gewonnen Veilingen
      </Typography>

      {aankopen.length === 0 ? (
        <Box textAlign="center" py={5} bgcolor="#f5f5f5" borderRadius={4}>
            <Typography variant="h6" color="text.secondary">
                U heeft nog geen veilingen gewonnen.
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Ga snel naar het live scherm en doe mee!
            </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {aankopen.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.productID}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Badge voor datum */}
                <Chip 
                    icon={<EventIcon sx={{ color: 'white !important' }} />} 
                    label={new Date(product.verkoopDatum).toLocaleDateString()} 
                    sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }} 
                />

                {product.imageUrl ? (
                    <CardMedia
                        component="img"
                        height="200"
                        image={product.imageUrl}
                        alt={product.naam}
                        sx={{ objectFit: 'cover' }}
                    />
                ) : (
                    <Box height={200} bgcolor="#eee" display="flex" alignItems="center" justifyContent="center">
                        Geen afbeelding
                    </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {product.naam}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {product.beschrijving.substring(0, 100)}...
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mt="auto">
                    <EuroIcon color="success" />
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                        {product.eindprijs}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        (Gewonnen bod)
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}