import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

import { jwtDecode } from "jwt-decode"; 
import { useUser } from "./UserContext";

// 1. DIT IS DE GROTE WIJZIGING!
// We vertellen de decoder om te zoeken naar de *echte* naam van de claim.
interface DecodedToken {
  sub: string;
  email: string;
  name: string;
  jti: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string | string[];
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: DecodedToken | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const { setUiSettings } = useUser();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      decodeAndSetUser(token);

      const fetchUiSettings = async () => {
        const decoded = jwtDecode<DecodedToken>(token);
        const user = decoded;
        const res = await fetch(`/api/Gebruiker/${user?.sub}/uisettings`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const raw = await res.json();
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          console.log("Fetched UI settings:", parsed);
          setUiSettings(parsed); // hydrate UserContext
        }
      };
      fetchUiSettings();
    } else {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setUser(null);
    }
  }, []);

  const decodeAndSetUser = (token: string) => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setUser(decoded);

      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      if (Array.isArray(roleClaim)) {
        setIsAdmin(roleClaim.includes("admin"));
      } else if (typeof roleClaim === "string") {
        setIsAdmin(roleClaim === "admin");
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Failed to decode token:", err);
      logout();
    }
  };

  const login = async (token: string) => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    decodeAndSetUser(token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUser(null);

    setUiSettings({
      theme: "light",
      highContrast: false,
      fontSize: 16,
    }); // Clear UiSettings on logout

  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
