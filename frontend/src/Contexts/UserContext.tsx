// UserContext.tsx
import React, { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  jti: string;
}

interface UiSettings {
  theme?: "light" | "dark";
  highContrast?: boolean;
  fontSize?: number;
}

interface UserContextType {
  user: JwtPayload | null;
  uiSettings: UiSettings;
  setUiSettings: (settings: UiSettings) => void;
  setUser: (user: JwtPayload | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [uiSettings, setUiSettings] = useState<UiSettings>({
    theme: "light",
    highContrast: false,
    fontSize: 16,
  });

  return (
    <UserContext.Provider value={{user, uiSettings, setUiSettings, setUser}}>
      {children}
    </UserContext.Provider>
  );
}


export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}