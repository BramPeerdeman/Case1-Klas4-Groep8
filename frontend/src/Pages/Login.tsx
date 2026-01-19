import { useState, useEffect } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";
import { useUser } from "../Contexts/UserContext";
import { jwtDecode } from "jwt-decode";
import { usePageTitle } from "../Hooks/usePageTitle";

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  jti: string;
}

export default function Login() {
  usePageTitle("Inloggen");
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth(); // 'login' komt uit je context
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>(""); // // NIEUW: Om fouten te tonen
  const { setUiSettings } = useUser(); // <-- import from UserContext

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5299';

  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

const handleLogin = async (event: React.FormEvent) => {
  event.preventDefault();
  setError("");

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, wachtwoord: password }),
    });

    if (response.ok) {
      const data = await response.json(); // UserDto with token
      login(data.token); // store token in AuthContext

      // Decode token to get userId
      const decoded: JwtPayload = jwtDecode(data.token);
      const userId = decoded.sub;

      // Fetch UiSettings immediately
      const settingsRes = await fetch(`${baseUrl}/api/Gebruiker/${userId}/uisettings`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      if (settingsRes.ok) {
        const raw = await settingsRes.json();
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        setUiSettings(parsed); // hydrate context
      }

      navigate("/"); // redirect to home
    } else {
      setError("Ongeldige e-mail of wachtwoord.");
    }
  } catch (err) {
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