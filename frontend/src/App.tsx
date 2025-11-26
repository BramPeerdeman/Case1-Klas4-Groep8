import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import Home from "./Pages/Home";
import About from "./Pages/About";
import Contact from "./Pages/Contact";
import Klok from "./Pages/Klok";
import LoginPage from "./Pages/Login";
import ProtectedRoute from "./Components/ProtectedRoute";
import Register from './Pages/Register';
import AdminPage from "./Pages/AdminPage";
import Settings from "./Pages/Settings";
import { AuthProvider } from "./Contexts/AuthContext";
import { useUser } from "./Contexts/UserContext";
import { UserProvider } from "./Contexts/UserContext";
import { baseTheme } from "./theme"; // your static theme
import { buildTheme } from "./dynamicTheme";

// Build theme dynamically from UiSettings
function ThemedRoutes() {
  const { uiSettings } = useUser();

  const theme = buildTheme(uiSettings);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/klok/:id" element={<Klok />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

const App: React.FC = () => (
  <Router>
    <UserProvider>
      <AuthProvider>
        <ThemedRoutes />
      </AuthProvider>
    </UserProvider>
  </Router>
);


export default App;

