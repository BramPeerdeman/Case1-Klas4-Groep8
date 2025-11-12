import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

/*
vgm doet deze context nog niks, maar is voorbereid voor toekomstige instellingen.
*/

interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
    const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <SettingsContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
