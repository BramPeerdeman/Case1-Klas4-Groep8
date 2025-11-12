import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Container, Typography, Card, CardContent, Box, TextField, Button } from "@mui/material";

interface JwtPayload {
  sub: string;   // gebruiker.Id
  email: string;
  name: string;
  jti: string;
}

export default function Settings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const token = localStorage.getItem("token");
  const decoded: JwtPayload | null = token ? jwtDecode<JwtPayload>(token) : null;
  const userId = decoded?.sub;

  async function updateUsername(userId: string, newUsername: string, password: string, token: string) {
    const response = await fetch(`https://localhost:7242/api/Gebruiker/${userId}/username`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ newUsername, currentPassword: password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Update mislukt");
    }

    const data = await response.json();

    // If backend returns a new token, store it
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Instellingen
      </Typography>
      <Card>
        <CardContent>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Huidige Gebruikersnaam"
              variant="outlined"
              value={decoded?.name || ""}
              disabled
            />
            <TextField
              label="Nieuwe Gebruikersnaam"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Wachtwoord"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              variant="contained"
              onClick={() => {
                if (userId && token) {
                  updateUsername(userId, username, password, token)
                    .then(() => {
                      alert("Gebruikersnaam bijgewerkt!");
                      setUsername("");
                      setPassword("");
                      window.location.reload(); // reload so decoded picks up new token
                    })
                    .catch(err => alert(err.message));
                }
              }}
            >
              Opslaan
            </Button>

            <TextField
              label="E-mail"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
