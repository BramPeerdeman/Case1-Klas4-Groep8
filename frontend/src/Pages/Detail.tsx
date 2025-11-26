import { useParams } from "react-router-dom";
import { Box, Container, Typography, Grid, Card, CardMedia, CardContent } from "@mui/material";
import { fetchProducts } from "../Data/Products";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const { products, loading } = fetchProducts();

  if (loading) return <div>Loading...</div>;

  const product = products.find((p) => p.id.toString() === id);
  if (!product) return <div>Product not found</div>;

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      
      {/* --- RESPONSIVE GRID --- */}
      <Grid 
        container 
        spacing={{ xs: 2, md: 3 }} 
        columns={{ xs: 4, sm: 8, md: 12 }}
      >

        {/* IMAGE */}
        <Grid size={{xs:4, sm:4, md:6}}>
          <Card 
            elevation={4}
            sx={{ 
              borderRadius: 3,
              overflow: "hidden"
            }}
          >
            <CardMedia
              component="img"
              image={product.imageUrl}
              alt={product.name}
              sx={{
                height: "100%",
                maxHeight: 450,
                objectFit: "cover",
              }}
            />
          </Card>
        </Grid>

        {/* PRODUCT INFO */}
        <Grid size={{xs:4, sm:4, md:6}}>
          <Card elevation={3} sx={{ borderRadius: 3, p: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {product.name}
              </Typography>

              {/* <Typography variant="h5" color="primary" fontWeight={600} gutterBottom>
                € {product.price}
              </Typography> */}

              <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
                Dit is een {product.name}. Perfect voor uw tuin!
              </Typography>

              <Box sx={{ mt: 4 }}>
                {/* <Button 
                  variant="contained" 
                  size="large"
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  Plaats een bod
                </Button> */}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Container>
  );
}
