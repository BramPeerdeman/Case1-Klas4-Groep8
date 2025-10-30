import { Box, Container, Grid, Typography } from "@mui/material";
import ProductCard from "../Components/ProductCard";
import { dummyProducts } from "../Data/dummyProducts";

export default function Home() {
  return (
    <>
      {/* Hero Afbeelding */}
      <Box
      role="img"
      aria-label="Bloemen in de veilinghal bij FloraHolland"
        sx={{
          width: "100%",
          height: "400px",
          backgroundImage: `url('https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          mt: 0,
        }}
      />

      <Container sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom>
          Populaire producten
        </Typography>

        <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
          {dummyProducts.map((product) => (
            <Grid key={product.id} size={{xs: 2, sm:4, md: 4}}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
