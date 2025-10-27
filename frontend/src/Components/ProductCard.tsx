import { Card, CardMedia, CardContent, Typography, CardActions, Button } from "@mui/material";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: string;
    image: string;
  };
}

export default function ProductCard({ product }: ProductProps) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia component="img" image={product.image} alt={product.name} height="200" />
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Typography color="text.secondary">{product.price}</Typography>
      </CardContent>
      <CardActions>
        <Button size="small" variant="contained">
          Bekijken
        </Button>
      </CardActions>
    </Card>
  );
}
