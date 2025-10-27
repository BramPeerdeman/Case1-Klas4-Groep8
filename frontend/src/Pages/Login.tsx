import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Card,
  CardContent,
} from "@mui/material";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log("Dummy login:", { email, password });
    navigate('/')
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">
            Inloggen
          </Typography>

          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />

            <TextField
              label="Wachtwoord"
              type="password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              fullWidth
              sx={{ mt: 1 }}
            >
              Inloggen
            </Button>

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Link href="#" underline="hover">
                Wachtwoord vergeten?
              </Link>
            </Box>

            <Button variant="outlined" color="secondary" fullWidth>
              Registreren
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
