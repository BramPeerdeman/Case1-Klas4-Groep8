import { Card, CardMedia, CardContent, Typography, CardActions, Button, Box, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EditIcon from '@mui/icons-material/Edit';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { getImageUrl } from "../Utils/ImageUtils";

interface ProductProps {
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
    locatie?: string;
    aantal?: number;
    beginDatum?: string;
    isAuctionable?: boolean; // New optional prop
  };
  onDelete?: (id: number) => void; 
  onEdit?: (id: number) => void;
  onStop?: (id: number) => void; // New optional handler
}

const ProductCard: React.FC<ProductProps> = ({ product, onDelete, onEdit, onStop }) => {
  const navigate = useNavigate();
  
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", position: 'relative' }}>
        
      {/* Label voor aantal */}
      {product.aantal !== undefined && product.aantal > 1 && (
        <Chip 
            label={`${product.aantal}x`} 
            color="primary" 
            size="small" 
            sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }} 
        />
      )}

      {/* Live Status Label */}
      {product.isAuctionable && (
        <Chip 
            label="Live / In Wachtrij" 
            color="success" 
            size="small" 
            sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }} 
        />
      )}

      <CardMedia 
        component="img" 
        image={getImageUrl(product.imageUrl)} 
        alt={product.name} 
        height="200" 
        sx={{ objectFit: 'cover' }}
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{product.name}</Typography>
        
        {/* Datum weergave (optioneel) */}
        {product.beginDatum && (
             <Typography variant="body2" color="text.secondary">
                Datum: {new Date(product.beginDatum).toLocaleDateString()}
             </Typography>
        )}

        {/* Locatie */}
        {product.locatie && (
            <Box display="flex" alignItems="center" mt={1} color="text.secondary">
                <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">{product.locatie}</Typography>
            </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
        <Box display="flex" gap={1}>
            <Button size="small" variant="contained" onClick={() => navigate(`/klok/${product.id}`)}>
            Bekijken
            </Button>
            
            {onEdit && (
                <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<EditIcon />}
                    onClick={() => onEdit(product.id)}
                    disabled={product.isAuctionable} // Disable edit if live, or force stop first
                >
                    Wijzig
                </Button>
            )}
        </Box>

        <Box display="flex" gap={1}>
            {/* New STOP Button */}
            {onStop && product.isAuctionable && (
                <Button 
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<StopCircleIcon />}
                    onClick={() => onStop(product.id)}
                >
                    Stop
                </Button>
            )}

            {onDelete && (
            <Button 
                size="small" 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={() => onDelete(product.id)}
                disabled={product.isAuctionable} // Disable delete if live, allow stop first
            >
                Verwijder
            </Button>
            )}
        </Box>
      </CardActions>
    </Card>
  );
}

export default ProductCard;