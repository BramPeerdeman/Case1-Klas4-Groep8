import { useState } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent, Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../Hooks/usePageTitle";

export default function Register() {
  usePageTitle("Inloggen");
  const navigate = useNavigate();

  // Lokaal pakt hij localhost, op Azure pakt hij de link uit .env.production
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';
  
  // States voor alle velden uit je RegisterDto
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [gebruikersnaam, setGebruikersnaam] = useState<string>("");
  const [voornaam, setVoornaam] = useState<string>("");
  const [achternaam, setAchternaam] = useState<string>("");
  const [kvkNummer, setKvkNummer] = useState<string>("");
  const [type, setType] = useState<string>("koper"); // Standaard "koper"
  
  const [error, setError] = useState<string>(""); // Voor foutmeldingen

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(""); // Reset fouten

    try {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          wachtwoord: password,
          gebruikersnaam: gebruikersnaam,
          voornaam: voornaam,
          achternaam: achternaam,
          type: type, // "koper", "veiler", etc.
          kvkNummer: type === "veiler" ? kvkNummer : null 
        }),
      });

      if (response.ok) {
        // SUCCES!
        // Stuur de gebruiker naar de login pagina zodat ze kunnen inloggen
        navigate("/login");
      } else {
        // FOUT: Backend gaf een 400 (Bad Request)
        const errorText = await response.text();

      // 1. Check eerst op de specifieke fouten die we net hebben gemaakt
      if (errorText.includes("e-mail bestaat al")) {
          setError("Een gebruiker met deze e-mail bestaat al.");
      } 
      else if (errorText.includes("gebruikersnaam is al in gebruik")) {
          setError("Deze gebruikersnaam is al in gebruik.");
      }
      // 2. Check op te zwak wachtwoord (dit komt van Identity)
      else if (errorText.includes("Passwords must be at least")) {
          setError("Wachtwoord is te zwak. Het moet minimaal 6 tekens lang zijn.");
      }
      else if (errorText.includes("Passwords must have at least one non-alphanumeric character")) {
          setError("Wachtwoord moet minimaal één speciaal teken hebben (bv. !, #, @).");
      }
      // 3. De algemene vangnet-fout
      else {
          setError("Registratie mislukt. Controleer alle velden.");
          console.error("Onbekende backend fout:", errorText); // Log de fout voor jezelf
      }
      }
    } catch (err) {
      // FOUT: Netwerkfout
      setError("Kan geen verbinding maken met de server.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">Registreren</Typography>
          
          <Box component="form" onSubmit={handleRegister} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Voornaam" variant="outlined" value={voornaam} onChange={e => setVoornaam(e.target.value)} required fullWidth />
            <TextField label="Achternaam" variant="outlined" value={achternaam} onChange={e => setAchternaam(e.target.value)} required fullWidth />
            <TextField label="Gebruikersnaam" variant="outlined" value={gebruikersnaam} onChange={e => setGebruikersnaam(e.target.value)} required fullWidth />
            <TextField label="Email" type="email" variant="outlined" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
            <TextField label="Wachtwoord" type="password" variant="outlined" value={password} onChange={e => setPassword(e.target.value)} required fullWidth />
            
            {/* Keuzemenu voor het type gebruiker */}
            <FormControl fullWidth>
              <InputLabel>Ik ben een...</InputLabel>
              <Select
                value={type}
                label="Ik ben een..."
                onChange={e => setType(e.target.value)}
              >
                <MenuItem value={"koper"}>Koper</MenuItem>
                <MenuItem value={"veiler"}>Veiler (verkoper)</MenuItem>
                {/* Je wilt wss niet dat "admin" hier staat */}
              </Select>
            </FormControl>

              {type === "veiler" && (
                <TextField
                  label="KVK Nummer"
                  variant="outlined"
                  value={kvkNummer}
                  onChange={(e) => setKvkNummer(e.target.value)}
                  required
                  fullWidth
                />
              )}
            {/* Toon de foutmelding als die er is */}
            {error && (
              <Typography color="error" align="center" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>Registreren</Button>
            <Button variant="outlined" color="secondary" onClick={() => navigate("/login")} fullWidth>
              Terug naar inloggen
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};