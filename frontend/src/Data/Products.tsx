const apiUrl = '/api/Product/products';

//voor de interface ApiProduct moet je er voor zorgen dat de velden overeenkomen met die van de tabel Product in de database.
//Het is hoofdletter gevoelig dus let daar op.
interface ApiProduct {
    productID: number;
    naam: string;
    beschrijving: string;
    /*
    In de backend is er een post methode voor 'https://localhost:7242/api/Product/product/veilbarelijst'.
    Maar om deze te laten werken, moet de onderstaande logica veranderen.
    Voor nu gebruiken we dus 'https://localhost:7242/api/Product/products'.
    */
    startPrijs: number | null;
    minPrijs: number | null;
    eindprijs: number | null;
    verkoperID: number;
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
                //hier transformeren we de ApiProduct naar Product
                const transformedProducts: Product[] = data.map(item => {
                    console.log('itemid:', item.productID);
                    return {
                        id: item.productID,
                        name: item.naam,
                        price: item.startPrijs ?? 0, // Use startPrijs, default to 0 if null
                        imageUrl: "https://images.pexels.com/photos/992734/pexels-photo-992734.jpeg" // Assuming no image URL in API response
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
import { useState, useEffect } from 'react';

interface Product {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
}
export { fetchProducts };