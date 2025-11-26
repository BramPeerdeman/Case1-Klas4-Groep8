import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { useUser } from "./UserContext";

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
  isVeiler: boolean;
  user: DecodedToken | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVeiler, setIsVeiler] = useState(false);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const { setUiSettings } = useUser();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      decodeAndSetUser(token);
      fetchUiSettings(token);
    } else {
      setIsLoggedIn(false);
      setIsAdmin(false);
      setIsVeiler(false);
      setUser(null);
    }
  }, []);

  const decodeAndSetUser = (token: string) => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setUser(decoded);

      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const hasRole = (role: string) =>
        Array.isArray(roleClaim) ? roleClaim.includes(role) : roleClaim === role;

      setIsAdmin(hasRole("admin"));
      setIsVeiler(hasRole("veiler"));
    } catch (err) {
      console.error("Failed to decode token:", err);
      logout();
    }
  };

  const fetchUiSettings = async (token: string) => {
    const decoded = jwtDecode<DecodedToken>(token);
    const res = await fetch(`/api/Gebruiker/${decoded.sub}/uisettings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const raw = await res.json();
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      setUiSettings(parsed);
    }
  };

  const login = (token: string) => {
    localStorage.setItem("token", token);
    setIsLoggedIn(true);
    decodeAndSetUser(token);
    fetchUiSettings(token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setIsVeiler(false);
    setUser(null);
    setUiSettings({ theme: "light", highContrast: false, fontSize: 16 });
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, isVeiler, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

