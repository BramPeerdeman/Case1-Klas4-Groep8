import { Box, Typography } from "@mui/material";

export default function Footer() {
  return (
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
      <Typography variant="body2">© {new Date().getFullYear()} Mijn Webshop</Typography>
    </Box>
  );
}
