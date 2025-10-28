import { useParams } from "react-router-dom";
import { dummyProducts } from "../Data/dummyProducts";
import { Box, Container, Typography } from "@mui/material";

export default function Klok() {
    const { id } = useParams<{id: string }>();
    const product = dummyProducts.find(p => p.id?.toString() === id);

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <Container sx={{ py: 4 }}>
            <Box display="flex" flexDirection="column" alignItems="center">
                <img src={product.image} alt={product.name} style={{ maxWidth: '100%', height: 'auto' }} />
                <Typography variant="h4" gutterBottom>{product.name}</Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>{product.price}</Typography>
                <Typography variant="body1">
                    Dit is een {product.name}. Perfect voor uw tuin!
                </Typography>
            </Box>
        </Container>
    );
}
