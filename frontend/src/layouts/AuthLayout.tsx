import { Container } from "@mui/material";
import { Outlet } from "react-router-dom";

const AuthLayout: React.FC = () => {
  return (
    <Container sx={{ mt: 8 }}>
      <Outlet />
    </Container>
  );
}

export default AuthLayout;
