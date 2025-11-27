import { useState, useEffect } from 'react';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
const apiUrl = `${baseUrl}/api/Product/products`;

// We gebruiken hier nu DEZELFDE namen als C# (Backend)
// Dit voorkomt verwarring tussen 'id' en 'productID'
export interface Product {
    productID: number;      // Was voorheen 'id'
    naam: string;           // Was voorheen 'name'
    beschrijving: string;
    startPrijs: number;     // Was voorheen 'price'
    imageUrl?: string;
    verkoperID?: number;
}

function fetchProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function getProducts() {
            try {
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // We hoeven NIET meer te mappen naar nieuwe namen.
                    // We zorgen alleen dat null-waardes worden opgevangen.
                    const cleanData: Product[] = data.map((item: any) => ({
                        ...item,
                        startPrijs: item.startPrijs ?? 0, // Zorg dat prijs nooit null is
                        // We behouden productID, naam, etc. zoals ze zijn
                    }));

                    setProducts(cleanData);
                }
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