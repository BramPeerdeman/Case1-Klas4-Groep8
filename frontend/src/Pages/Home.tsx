import { Box, Container, Grid, Typography } from "@mui/material";
import ProductCard from "../Components/Productcard";

const dummyProducts = [
  { id: 1, name: "Sneakers", price: "€89,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
  { id: 2, name: "Koptelefoon", price: "€129,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
  { id: 3, name: "Smartwatch", price: "€199,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
  { id: 4, name: "Zonnebril", price: "€59,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
  { id: 5, name: "Zonnebril", price: "€59,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
  { id: 6, name: "Zonnebril", price: "€59,99", image: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" },
];

export default function Home() {
  return (
    <>
      {/* Hero Afbeelding */}
      <Box
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
