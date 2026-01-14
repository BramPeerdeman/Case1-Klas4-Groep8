import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  IconButton,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

export default function Navbar() {
  const { isLoggedIn, logout, isAdmin, isVeiler, isKoper } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleProfile = () => {
    handleMenuClose();
    navigate("/profiel");
  };
  const handleLoginLogout = () => {
    handleMenuClose();
    isLoggedIn ? logout() : navigate("/login");
  };
  const handleSettings = () => {
    handleMenuClose();
    isLoggedIn ? navigate("/settings") : navigate("/login");
  };

  return (
    <AppBar
      position="sticky"
      component="nav"
      sx={{ backgroundColor: "primary.main", px: 2 }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        {/* Brand / Home link */}
        <Typography
          component={Link}
          to="/"
          variant="h6"
          sx={{
            color: "inherit",
            textDecoration: "none",
            fontWeight: "bold",
            "&:focus": { outline: "2px solid #fff", outlineOffset: "2px" },
          }}
        >
          BloemenVeiling
        </Typography>

        {/* Navigation links */}
        <Box
          component="nav"
          aria-label="Hoofdmenu"
          sx={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          <Button
            color="inherit"
            component={Link}
            to="/about"
            sx={{
              "&:focus": { outline: "2px solid #fff", outlineOffset: "2px" },
            }}
          >
            Over
          </Button>
          <Button
            color="inherit"
            component={Link}
            to="/contact"
            sx={{
              "&:focus": { outline: "2px solid #fff", outlineOffset: "2px" },
            }}
          >
            Contact
          </Button>
          {isLoggedIn && isKoper && (
            <Button
              color="inherit"
              component={Link}
              to="/mijn-aankopen"
              sx={{
                fontWeight: "bold",
                color: "cyan", // Een opvallend kleurtje voor de koper
                "&:focus": { outline: "2px solid #fff", outlineOffset: "2px" },
              }}
            >
              Mijn Aankopen
            </Button>
          )}
          {/* Admin only button */}
          {isAdmin && (
            <Button
              color="inherit"
              component={Link}
              to="/Veilingmeester"
              sx={{
                fontWeight: "bold",
                color: "yellow",
                "&:focus": { outline: "2px solid #fff", outlineOffset: "2px" },
              }}
            >
              Veilingmeester
            </Button>
          )}
          {isVeiler && (
          <Button 
            color="inherit" 
            component={Link} 
            to="/verkoper" 
            sx={{ fontWeight: 'bold', color: 'lightgreen' }}
          >
            Verkoper Dashboard
          </Button>
        )}

          {/* Accessible user menu */}
          <IconButton
            onClick={handleMenuOpen}
            aria-label="Gebruikersmenu openen"
            aria-controls={anchorEl ? "user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={anchorEl ? "true" : undefined}
            sx={{ p: 0 }}
          >
            <Avatar
              src="https://i.pravatar.cc/40"
              alt="Gebruikersprofiel"
              sx={{
                width: 40,
                height: 40,
                border: "2px solid white",
              }}
            />
          </IconButton>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "user-menu-button",
              role: "menu",
            }}
          >
            <MenuItem onClick={handleProfile}>Profiel</MenuItem>
            <MenuItem onClick={handleLoginLogout}>
              {isLoggedIn ? "Uitloggen" : "Inloggen"}
            </MenuItem>
            <MenuItem onClick={handleSettings}>Instellingen</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
