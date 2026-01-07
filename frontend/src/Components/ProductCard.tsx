import { Card, CardMedia, CardContent, Typography, CardActions, Button, Box, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { getImageUrl } from "../Utils/ImageUtils";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
    locatie?: string; // Nieuw
    aantal?: number;  // Nieuw
  };
  onDelete?: (id: number) => void; 
}

const ProductCard: React.FC<ProductProps> = ({ product, onDelete }) => {
  const navigate = useNavigate();
  
  const handleView = () => {
    navigate(`/klok/${product.id}`);
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", position: 'relative' }}>
        
      {/* Label voor aantal (alleen als het meer dan 1 is) */}
      {product.aantal !== undefined && product.aantal > 1 && (
        <Chip 
            label={`${product.aantal}x`} 
            color="primary" 
            size="small" 
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }} 
        />
      )}

      <CardMedia 
        component="img" 
        image={getImageUrl(product.imageUrl)} // <--- Gebruik de helper functie
        alt={product.name} 
        height="200" 
        sx={{ objectFit: 'cover' }}
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{product.name}</Typography>
        
        <Typography variant="h6" color="primary">
            € {(product.price ?? 0).toFixed(2)}
        </Typography>

        {/* Toon locatie als die er is */}
        {product.locatie && (
            <Box display="flex" alignItems="center" mt={1} color="text.secondary">
                <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">{product.locatie}</Typography>
            </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
        <Button size="small" variant="contained" onClick={handleView}>
          Bekijken
        </Button>

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