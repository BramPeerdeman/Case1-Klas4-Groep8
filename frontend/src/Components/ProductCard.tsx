import { Card, CardMedia, CardContent, Typography, CardActions, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: number;
    image?: string;
  };
}

const ProductCard: React.FC<ProductProps> = ({ product }) => {
  const navigate = useNavigate();
  const handleView = () => {
    navigate(`/klok/${product.id}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia component="img" image={"https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg"} alt={product.name} height="200" />
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Typography color="text.secondary">{product.price.toFixed(2)} EUR</Typography>
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
