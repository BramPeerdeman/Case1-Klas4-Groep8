import { Box, Container, Grid, Typography, Button } from "@mui/material";
import ProductCard from "../Components/ProductCard";
import { fetchProducts } from "../Data/Products";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  // ✅ Always call hooks at the top
  const { products, loading } = fetchProducts();
  const [featuredProduct, setFeaturedProduct] = useState<typeof products[0] | null>(null);
  const navigate = useNavigate();

  // ✅ Set a featured product once products are loaded
  useEffect(() => {
    if (!loading && products.length > 0) {
      setFeaturedProduct(products[0]); // first product as featured
    }
  }, [loading, products]);

  // ✅ Render loading state while products are fetching
  if (loading) return <div>Loading...</div>;

  // ✅ If no products available
  if (!featuredProduct) return <div>Geen producten beschikbaar</div>;

  return (
    <>
      {/* Featured Product Hero */}
      <Box
        position="relative"
        sx={{
          width: "100%",
          height: "400px",
          backgroundImage: `url('${featuredProduct.imageUrl}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: 2,
          mt: 0,
        }}
      >
        {/* Gradient overlay for button visibility */}
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          sx={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))' }}
        />

        {/* Button on top of image */}
        <Button
          variant="contained"
          color="primary"
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
          }}
          onClick={() => navigate(`/klok/${featuredProduct.id}`)}
        >
          Naar veiling
        </Button>
      </Box>

      <Container sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom>
          Populaire producten
        </Typography>

        <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
          {products.map((product) => (
            <Grid key={product.id} size={{xs: 2, sm:4, md: 4}}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}