import { useState, useEffect } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth(); // 'login' komt uit je context
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>(""); // // NIEUW: Om fouten te tonen

  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  // NIEUW: De handleLogin functie is nu async
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); // Voorkom dat de pagina herlaadt
    setError(""); // Reset foutmeldingen bij nieuwe poging

    try {
      const response = await fetch("http://localhost:5299/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          wachtwoord: password, // Zorg dat deze namen matchen met je LoginDto
        }),
      });

      if (response.ok) {
        // SUCCES!
        const data = await response.json(); // Dit is je UserDto (met token)
        
        // Roep de 'login' functie uit je AuthContext aan MET de token
        login(data.token); // <-- BELANGRIJK: je context moet de token opslaan
        
        navigate("/"); // Stuur door naar de homepagina
      } else {
        // FOUT: Backend gaf een 401 (Unauthorized) of andere fout
        setError("Ongeldige e-mail of wachtwoord.");
      }
    } catch (err) {
      // FOUT: Netwerkfout (bv. backend draait niet)
      setError("Kan geen verbinding maken met de server.");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">Inloggen</Typography>
          
          {/* NIEUW: We gebruiken onSubmit op het formulier */}
          <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Email" type="email" variant="outlined" value={email} onChange={e => setEmail(e.target.value)} required fullWidth />
            <TextField label="Wachtwoord" type="password" variant="outlined" value={password} onChange={e => setPassword(e.target.value)} required fullWidth />
            
            {/* NIEUW: Toon de foutmelding als die er is */}
            {error && (
              <Typography color="error" align="center" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}

            {/* NIEUW: Dit is nu een 'submit' knop voor het formulier */}
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>Inloggen</Button>
            <Button 
    variant="outlined" 
    color="secondary" 
    fullWidth 
    onClick={() => navigate("/register")}  // <-- VOEG DEZE REGEL TOE
>
    Registreren
</Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};