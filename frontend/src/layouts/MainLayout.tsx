import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

const MainLayout: React.FC = () => (
  <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
    <Navbar />
    <Container component="main" sx={{ mt: 4, flexGrow: 1 }}>
      <Outlet />
    </Container>
    <Footer />
  </Box>
);

export default MainLayout;
