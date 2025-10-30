import { useState } from "react";
import { AppBar, Toolbar, Button, Box, Avatar, Menu, MenuItem, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

const Navbar: React.FC = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleProfile = () => { handleMenuClose(); navigate("/profile"); };
  const handleLoginLogout = () => { handleMenuClose(); isLoggedIn ? logout() : navigate("/login"); };

  return (
    <AppBar position="sticky" sx={{ backgroundColor: "primary.main", px: 2 }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography component={Link} to="/" variant="h6" sx={{ color: "inherit", textDecoration: "none", fontWeight: "bold" }}>
          BloemenVeiling
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button color="inherit" component={Link} to="/about">Over</Button>
          <Button color="inherit" component={Link} to="/contact">Contact</Button>
          <Avatar src="https://i.pravatar.cc/40" sx={{ cursor: "pointer" }} onClick={handleMenuOpen} />
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLoginLogout}>{isLoggedIn ? "Logout" : "Login"}</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
