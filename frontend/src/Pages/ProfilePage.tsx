import { useState, useEffect } from "react";
import { Container, TextField, Button, Typography, Box, Alert, Paper } from "@mui/material";
import { useAuth } from "../Contexts/AuthContext"; // Pas aan als jouw pad anders is
import { getMyProfile, updateMyProfile, type UpdateProfileData } from "../Services/authService";
import { usePageTitle } from "../Hooks/usePageTitle";
export default function ProfilePage() {
    usePageTitle("Mijn Profiel");
    //const { login, logout } = useAuth(); // We hebben login nodig om het token te verversen als dat moet
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Formulier velden
    const [formData, setFormData] = useState({
        gebruikersnaam: "",
        email: "",
        huidigWachtwoord: "",
        nieuwWachtwoord: "",
    });

    //  Gegevens ophalen bij laden pagina
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        getMyProfile(token)
            .then((data) => {
                setFormData((prev) => ({
                    ...prev,
                    gebruikersnaam: data.gebruikersnaam,
                    email: data.email
                }));
            })
            .catch((err) => {
                console.error(err);
                setMessage({ type: 'error', text: "Kon gegevens niet ophalen." });
            })
            .finally(() => setLoading(false));
    }, []);

    //  Wijzigingen verwerken
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const token = localStorage.getItem("token");

        if (!token) return;

        // Maak het object voor de backend 
        const updateData: UpdateProfileData = {};
        if (formData.gebruikersnaam) updateData.nieuweGebruikersnaam = formData.gebruikersnaam;
        if (formData.email) updateData.nieuweEmail = formData.email;
        if (formData.nieuwWachtwoord) {
            updateData.huidigWachtwoord = formData.huidigWachtwoord;
            updateData.nieuwWachtwoord = formData.nieuwWachtwoord;
        }

        try {
            await updateMyProfile(token, updateData);
            setMessage({ type: 'success', text: "Profiel succesvol bijgewerkt!" });
            
            
            setFormData(prev => ({ ...prev, huidigWachtwoord: "", nieuwWachtwoord: "" }));
            
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "Er is iets misgegaan." });
        }
    };

    if (loading) return <Typography>Laden...</Typography>;

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Mijn Profiel
                </Typography>

                {message && (
                    <Alert severity={message.type} sx={{ mb: 2 }}>
                        {message.text}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    
                    <Typography variant="h6" sx={{ mt: 2 }}>Algemene Gegevens</Typography>
                    
                    <TextField
                        label="Gebruikersnaam"
                        value={formData.gebruikersnaam}
                        onChange={(e) => setFormData({ ...formData, gebruikersnaam: e.target.value })}
                        fullWidth
                    />
                    <TextField
                        label="E-mailadres"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        fullWidth
                    />

                    <Typography variant="h6" sx={{ mt: 2 }}>Wachtwoord Wijzigen (Optioneel)</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Vul dit alleen in als u uw wachtwoord wilt veranderen.
                    </Typography>

                    <TextField
                        label="Nieuw Wachtwoord"
                        type="password"
                        value={formData.nieuwWachtwoord}
                        onChange={(e) => setFormData({ ...formData, nieuwWachtwoord: e.target.value })}
                        fullWidth
                    />
                    
                    {/* Alleen tonen als er een nieuw wachtwoord is ingevuld */}
                    {formData.nieuwWachtwoord && (
                        <TextField
                            label="Huidig Wachtwoord (Verplicht ter bevestiging)"
                            type="password"
                            required
                            value={formData.huidigWachtwoord}
                            onChange={(e) => setFormData({ ...formData, huidigWachtwoord: e.target.value })}
                            fullWidth
                            color="warning"
                        />
                    )}

                    <Button type="submit" variant="contained" size="large" sx={{ mt: 2 }}>
                        Opslaan
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}