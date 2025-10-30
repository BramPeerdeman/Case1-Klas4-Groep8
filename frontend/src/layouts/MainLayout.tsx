import { Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import Navbar from "../Components/NavBar";
import Footer from "../Components/Footer";

const MainLayout: React.FC = () => (
  <>
    <Navbar />
    <Container sx={{ mt: 4 }}>
      <Outlet />
    </Container>
    <Footer />
  </>
);

export default MainLayout;
