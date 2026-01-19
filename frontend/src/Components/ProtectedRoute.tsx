import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom"; 
import { useAuth } from "../Contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";

interface ProtectedRouteProps { 
  children?: ReactNode; 
  requiredRole?: 'admin' | 'veiler'; 
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  // checked of gebruiker ingelogd is en welke rol die heeft
  const { isLoggedIn, isLoading, isAdmin, isVeiler } = useAuth();

  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // 3. Standard Login Check
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // 4. Role Check (Using your boolean flags)
  if (requiredRole === 'veiler' && !isVeiler) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Render children (if wrapped) or Outlet (if used as a layout route)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;