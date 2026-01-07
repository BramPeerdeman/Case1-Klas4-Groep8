import { useState } from "react";
import { 
  Container, Box, TextField, Button, Typography, Card, CardContent, 
  MenuItem, Select, InputLabel, FormControl, type SelectChangeEvent, CircularProgress 
} from "@mui/material";
import { useNotification } from "../Contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import ListIcon from '@mui/icons-material/List';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Interface voor de state (exclusief het bestand zelf)
interface NewProductForm {
  naam: string;
  beschrijving: string;
  minPrijs: string;
  aantal: string; // Nieuw veld
  locatie: string;
  beginDatum: string;
}

// De vaste locaties
const LOCATIES = ["Aalsmeer", "Naaldwijk", "Rijnsburg", "Eelde", "Rhein Maas"];

export default function VerkoperPage() {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // State
  const [formData, setFormData] = useState<NewProductForm>({
    naam: "",
    beschrijving: "",
    minPrijs: "",
    aantal: "",
    locatie: "", 
    beginDatum: ""
  });

  // Aparte state voor het bestand en de preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Loading state voor tijdens het uploaden
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper voor tekstvelden
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Helper voor de Select dropdown
  const handleSelectChange = (e: SelectChangeEvent) => {
    setFormData({
      ...formData,
      locatie: e.target.value as string,
    });
  };

  // Helper voor bestand upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Maak een tijdelijke URL zodat de gebruiker ziet wat hij kiest
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Submit functie
  const handleAddProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      notify("U bent niet ingelogd.", "error");
      return;
    }

    // Als je wilt verplichten dat er een plaatje is:
    /* if (!selectedFile) {
        notify("Selecteer aub een afbeelding.", "warning");
        return;
    } */

    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
      
      // We gebruiken FormData object omdat we een bestand sturen
      const dataToSend = new FormData();
      dataToSend.append("naam", formData.naam);
      dataToSend.append("beschrijving", formData.beschrijving);
      dataToSend.append("minPrijs", formData.minPrijs); 
      dataToSend.append("aantal", formData.aantal); 
      dataToSend.append("locatie", formData.locatie);
      dataToSend.append("beginDatum", formData.beginDatum);
      
      // Voeg het bestand toe (alleen als er een is gekozen)
      if (selectedFile) {
        dataToSend.append("imageFile", selectedFile); 
      }

      const response = await fetch(`${baseUrl}/api/Product/product`, {
        method: "POST",
        headers: {
          // BELANGRIJK: Bij FormData GEEN 'Content-Type': 'application/json' instellen!
          "Authorization": `Bearer ${token}` 
        },
        body: dataToSend,
      });

      if (response.ok) {
        notify("Product succesvol toegevoegd!", "success");
        // Reset form
        setFormData({ naam: "", beschrijving: "", minPrijs: "", aantal: "", locatie: "", beginDatum: "" });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        const errorText = await response.text();
        notify("Toevoegen mislukt.", "error");
        console.error("Backend error:", errorText);
      }
    } catch (err) {
      notify("Kan geen verbinding maken met de server.", "error");
      console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Verkoper Dashboard</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ListIcon />}
          onClick={() => navigate('/verkoper/producten')}
        >
          Mijn Producten
        </Button>
      </Box>
      
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Nieuw Product Aanbieden</Typography>
          
          <Box component="form" onSubmit={handleAddProduct} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            
            {/* Naam */}
            <TextField 
              label="Productnaam" 
              name="naam"
              variant="outlined" 
              value={formData.naam} 
              onChange={handleChange} 
              required fullWidth 
            />

            {/* Beschrijving */}
            <TextField 
              label="Beschrijving" 
              name="beschrijving"
              variant="outlined" 
              value={formData.beschrijving} 
              onChange={handleChange} 
              multiline rows={3} 
              required fullWidth 
            />

            <Box display="flex" gap={2}>
                {/* Locatie Dropdown */}
                <FormControl fullWidth required>
                    <InputLabel id="locatie-label">Locatie</InputLabel>
                    <Select
                        labelId="locatie-label"
                        name="locatie"
                        value={formData.locatie}
                        label="Locatie"
                        onChange={handleSelectChange}
                    >
                        {LOCATIES.map((loc) => (
                            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Aantal Veld */}
                <TextField 
                    label="Aantal" 
                    name="aantal"
                    type="number"
                    variant="outlined" 
                    value={formData.aantal} 
                    onChange={handleChange} 
                    required fullWidth 
                    slotProps={{ htmlInput: { min: 1 } }}
                />
            </Box>

            {/* Datum */}
            <TextField
              label="Startdatum Veiling"
              type="datetime-local"
              name="beginDatum"
              value={formData.beginDatum}
              onChange={handleChange}
              fullWidth
              required
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            {/* Prijs */}
            <TextField 
              label="Minprijs (€)" 
              name="minPrijs"
              type="number" 
              variant="outlined" 
              value={formData.minPrijs} 
              onChange={handleChange} 
              required fullWidth 
              slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
            />

            {/* Afbeelding Upload Sectie */}
            <Box border={1} borderColor="grey.300" borderRadius={1} p={2} textAlign="center">
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="raised-button-file"
                    type="file"
                    onChange={handleFileChange}
                />
                <label htmlFor="raised-button-file">
                    <Button variant="contained" component="span" startIcon={<CloudUploadIcon />}>
                        Afbeelding Uploaden
                    </Button>
                </label>
                
                {selectedFile && (
                    <Box mt={2}>
                        <Typography variant="body2">{selectedFile.name}</Typography>
                        {previewUrl && (
                            <Box 
                                component="img" 
                                src={previewUrl} 
                                alt="Preview" 
                                sx={{ mt: 1, maxHeight: 200, maxWidth: '100%', borderRadius: 1 }} 
                            />
                        )}
                    </Box>
                )}
            </Box>

            {/* Submit Button */}
            <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{ mt: 2 }}
                disabled={isSubmitting} // Voorkom dubbel klikken
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Product Toevoegen"}
            </Button>

          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};