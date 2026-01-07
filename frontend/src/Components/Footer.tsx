import { Box, Typography } from "@mui/material";

const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{ py: 3, textAlign: "center", backgroundColor: "primary.main", color: "white" }}
  >
    <Typography variant="body2">© {new Date().getFullYear()} BloemenVeiling</Typography>
  </Box>
);

export default Footer;
