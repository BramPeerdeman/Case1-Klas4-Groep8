import { useState, useEffect } from 'react';


// 1. Probeer de .env variabele, maar als die leeg is, gebruik localhost:5299
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';


const apiUrl = `${baseUrl}/api/Product/products`;



interface ApiProduct {
    productID: number;
    naam: string;
    beschrijving: string;
    startPrijs: number | null;
    minPrijs: number | null;
    eindprijs: number | null;
    verkoperID: number;
    imageUrl?: string; 
}

// Interface voor de Frontend
export interface Product {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
}

function fetchProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function getProducts() {
            try {
                const response = await fetch(apiUrl);
                console.log('API response status:', response.status);
                
                const data: ApiProduct[] = await response.json();
                
                const transformedProducts: Product[] = data.map(item => {
                    return {
                        id: item.productID,
                        name: item.naam,
                        // Als startPrijs null is, maak er 0 van
                        price: item.startPrijs ?? 0, 
                        // 2. HIER KOPPELEN WE DE AFBEELDING
                        imageUrl: item.imageUrl 
                    };
                });

                setProducts(transformedProducts);
                console.log('Fetched products:', transformedProducts);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        }

        getProducts();
    }, []);

    return { products, loading };
}

export { fetchProducts };