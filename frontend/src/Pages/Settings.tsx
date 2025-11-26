import { useAuth } from "../Contexts/AuthContext";
import { useUser } from "../Contexts/UserContext";
import { TextField, Button, Typography, Switch, Slider, Box } from "@mui/material";

export default function Settings() {
  // Identity comes from AuthContext
  const { user } = useAuth();

  // UI preferences come from UserContext
  const { uiSettings, setUiSettings } = useUser();

    const handleSave = async () => {
    if (!user) return;

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/Gebruiker/${user.sub}/uisettings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(uiSettings),
    });

    if (res.ok) {
      console.log("Settings saved!");
    } else {
      console.error("Failed to save settings");
    }
  };

  const handleThemeToggle = () => {
    setUiSettings({ ...uiSettings, theme: uiSettings.theme === "dark" ? "light" : "dark" });
  };

  const handleContrastToggle = () => {
    setUiSettings({ ...uiSettings, highContrast: !uiSettings.highContrast });
  };

  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    setUiSettings({ ...uiSettings, fontSize: value as number });
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Instellingen
      </Typography>

      {/* Identity from AuthContext */}
      <TextField
        label="Huidige Gebruikersnaam"
        value={user?.name || ""}
        disabled
        fullWidth
        sx={{ mb: 2 }}
      />

      {/* UI Preferences from UserContext */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography sx={{ flex: 1 }}>Donkere modus</Typography>
        <Switch checked={uiSettings.theme === "dark"} onChange={handleThemeToggle} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography sx={{ flex: 1 }}>Hoog contrast</Typography>
        <Switch checked={uiSettings.highContrast} onChange={handleContrastToggle} />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography>Lettergrootte</Typography>
        <Slider
          min={12}
          max={24}
          step={1}
          value={uiSettings.fontSize || 16}
          onChange={handleFontSizeChange}
          valueLabelDisplay="auto"
        />
      </Box>

      <Button variant="contained" color="primary" onClick={handleSave}>
        Opslaan
      </Button>
    </Box>
  );
}
