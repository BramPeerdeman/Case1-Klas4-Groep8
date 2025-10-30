import { Card, CardMedia, CardContent, Typography, CardActions, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: string;
    image: string;
  };
}

const ProductCard: React.FC<ProductProps> = ({ product }) => {
  const navigate = useNavigate();
  const handleView = () => {
    navigate(`/klok/${product.id}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia component="img" image={product.image} alt={product.name} height="200" />
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Typography color="text.secondary">{product.price}</Typography>
      </CardContent>
      <CardActions>
        <Button size="small" variant="contained" onClick={handleView}>
          Bekijken
        </Button>
      </CardActions>
    </Card>
  );
}

export default ProductCard;
