import { Card, CardMedia, CardContent, Typography, CardActions, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
  };
}

const ProductCard: React.FC<ProductProps> = ({ product }) => {
  const navigate = useNavigate();
  
  // --- STAP 4: BEPAAL WELKE FOTO GETOOND MOET WORDEN ---
  const defaultImage = "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg";
  
  // Logica: Is er een imageUrl EN is hij niet leeg? Gebruik die dan. Anders de standaardfoto.
  const displayImage = product.imageUrl && product.imageUrl.length > 0 
    ? product.imageUrl 
    : defaultImage;
  

  const handleView = () => {
    navigate(`/klok/${product.id}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Gebruik hier de variabele {displayImage} in plaats van de harde link */}
      <CardMedia 
        component="img" 
        image={displayImage} 
        alt={product.name} 
        height="200" 
      />
      
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