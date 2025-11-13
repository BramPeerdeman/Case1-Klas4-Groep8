import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode"; 

// 1. DIT IS DE GROTE WIJZIGING!
// We vertellen de decoder om te zoeken naar de *echte* naam van de claim.
interface DecodedToken {
  // We moeten de naam van de claim tussen aanhalingstekens zetten
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string | string[];
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
        checkAdminStatus(token); 
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };
    
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const checkAdminStatus = (token: string) => {
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      
      // 2. OOK HIER DE WIJZIGING:
      // We lezen nu de data uit het veld met de lange naam.
      const roleClaim = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      // 3. We controleren de 'roleClaim' variabele
      if (roleClaim) {
        if (Array.isArray(roleClaim)) {
          setIsAdmin(roleClaim.includes("admin"));
        } 
        else if (typeof roleClaim === "string") {
          setIsAdmin(roleClaim === "admin");
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      logout();
    }
  };

  const login = (token: string): void => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    checkAdminStatus(token);
    window.dispatchEvent(new Event("storage"));
  };

  const logout = (): void => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false); 
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};