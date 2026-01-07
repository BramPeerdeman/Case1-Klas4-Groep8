import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom"; // Added Outlet
import { useAuth } from "../Contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";

interface ProtectedRouteProps { 
  children?: ReactNode; // Made optional so you can use it as a layout wrapper
  requiredRole?: 'admin' | 'veiler'; // Restrict to your specific roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  // 1. Grab the new isLoading and your existing flags
  const { isLoggedIn, isLoading, isAdmin, isVeiler } = useAuth();

  // 2. Show a spinner while checking LocalStorage
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