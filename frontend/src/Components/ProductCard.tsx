import { Card, CardMedia, CardContent, Typography, CardActions, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from '@mui/icons-material/Delete'; // Add icon

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
  };
  // NEW OPTIONAL PROP
  onDelete?: (id: number) => void; 
}

const ProductCard: React.FC<ProductProps> = ({ product, onDelete }) => {
  const navigate = useNavigate();
  
  const defaultImage = "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg";
  const displayImage = product.imageUrl && product.imageUrl.length > 0 
    ? product.imageUrl 
    : defaultImage;
  
  const handleView = () => {
    navigate(`/klok/${product.id}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia 
        component="img" 
        image={displayImage} 
        alt={product.name} 
        height="200" 
      />
      
      <CardContent>
        <Typography variant="h6">{product.name}</Typography>
        <Typography color="text.secondary">{(product.price ?? 0).toFixed(2)} EUR</Typography>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button size="small" variant="contained" onClick={handleView}>
          Bekijken
        </Button>

        {/* ONLY SHOW IF onDelete IS PROVIDED */}
        {onDelete && (
          <Button 
            size="small" 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={() => onDelete(product.id)}
          >
            Verwijder
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default ProductCard;