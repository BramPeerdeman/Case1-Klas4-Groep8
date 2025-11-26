import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import VerkoperPage from "./Pages/VerkoperPage";

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/klok/:id" element={<Klok />} />
        <Route path="/Veilingmeester" element={<AdminPage />} />
        <Route path="/verkoper" element={<VerkoperPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

export default App;
