import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode"; 

// We zoeken naar de officiële naam van de rol-claim
interface DecodedToken {
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string | string[];
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isVeiler: boolean; 
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
  const [isVeiler, setIsVeiler] = useState<boolean>(false); 

  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
        checkRoles(token); 
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setIsVeiler(false); 
      }
    };
    
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  // Deze functie leest het paspoort en zoekt naar stempels
  const checkRoles = (token: string) => {
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      
      // Lees de rol-claim (kan een string zijn of een lijst strings)
      const roleClaim = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      // Reset eerst alles naar false
      setIsAdmin(false);
      setIsVeiler(false);

      if (roleClaim) {
        // Helper: Checkt of een specifieke rol aanwezig is
        const hasRole = (roleToCheck: string) => {
            if (Array.isArray(roleClaim)) {
                return roleClaim.includes(roleToCheck);
            }
            return roleClaim === roleToCheck;
        };

        // Zet de switches om
        setIsAdmin(hasRole("admin"));
        setIsVeiler(hasRole("veiler")); 
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      logout();
    }
  };

  const login = (token: string): void => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    checkRoles(token); 
    window.dispatchEvent(new Event("storage"));
  };

  const logout = (): void => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false); 
    setIsVeiler(false); 
    window.dispatchEvent(new Event("storage"));
  };

  return (
    // Geef 'isVeiler' ook door aan de rest van de app
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, isVeiler, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};