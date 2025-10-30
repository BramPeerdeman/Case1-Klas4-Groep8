import { useState, useEffect } from "react";
import { Container, Box, TextField, Button, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  useEffect(() => { if (isLoggedIn) navigate("/"); }, [isLoggedIn, navigate]);

  const handleLogin = () => { login(); navigate("/"); };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">Inloggen</Typography>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Email" type="email" variant="outlined" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
            <TextField label="Wachtwoord" type="password" variant="outlined" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
            <Button variant="contained" color="primary" onClick={handleLogin} fullWidth sx={{ mt: 1 }}>Inloggen</Button>
            <Button variant="outlined" color="secondary" fullWidth>Registreren</Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
