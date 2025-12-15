import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
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
import VeilingMeesterLive from "./Pages/VeilingMeesterLive";
import { AuthProvider } from "./Contexts/AuthContext";
import { useUser } from "./Contexts/UserContext";
import { UserProvider } from "./Contexts/UserContext";
import { buildTheme } from "./dynamicTheme";
import VerkoperPage from "./Pages/VerkoperPage";
import Detail from "./Pages/Detail";
import { NotificationProvider } from "./Contexts/NotificationContext";

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
          <Route path="/Veilingmeester" element={<AdminPage />} />
          <Route path="/VeilingmeesterLive" element={<ProtectedRoute requiredRole="admin"><VeilingMeesterLive /></ProtectedRoute>} />
          <Route path="/verkoper" element={<ProtectedRoute requiredRole="veiler"><VerkoperPage /></ProtectedRoute>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/product/:id" element={<Detail />} />
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
        <NotificationProvider>
          <ThemedRoutes />
        </NotificationProvider>
      </AuthProvider>
    </UserProvider>
  </Router>
);




export default App;

