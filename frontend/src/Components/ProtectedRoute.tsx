import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

interface ProtectedRouteProps { children: ReactNode; }

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
