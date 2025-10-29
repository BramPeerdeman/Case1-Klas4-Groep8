import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Container,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { Link, Outlet, useNavigate } from "react-router-dom";

export default function MainLayout() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleLoginLogout = () => {
    handleMenuClose();
    if (isLoggedIn) {
      setIsLoggedIn(false);
    } else {
      navigate("/login");
    }
  };

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "primary.main",
          px: 2,
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Left: Logo */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              color: "inherit",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            BloemenVeiling
          </Typography>

          {/* Right: Nav links + profile */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button color="inherit" component={Link} to="/about">
              Over
            </Button>
            <Button color="inherit" component={Link} to="/contact">
              Contact
            </Button>

            {/* Avatar */}
            <Avatar
              src="https://i.pravatar.cc/40"
              sx={{ cursor: "pointer" }}
              onClick={handleMenuOpen}
            />

            {/* Dropdown menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleProfile}>See Profile</MenuItem>
              <MenuItem onClick={handleLoginLogout}>
                {isLoggedIn ? "Logout" : "Login"}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container sx={{ mt: 4 }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          mt: 8,
          py: 3,
          textAlign: "center",
          backgroundColor: "primary.main",
          color: "white",
        }}
      >
        <Typography variant="body2">
          © {new Date().getFullYear()} BloemenVeiling
        </Typography>
      </Box>
    </>
  );
}
