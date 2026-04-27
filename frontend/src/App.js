import "@/index.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Fixture from "./pages/Fixture";
import Standings from "./pages/Standings";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Bookings from "./pages/Bookings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminPlayers from "./pages/admin/AdminPlayers";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCarnets from "./pages/admin/AdminCarnets";

function PublicLayout() {
  const loc = useLocation();
  const hideChrome = loc.pathname.startsWith("/login") || loc.pathname.startsWith("/registro");
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <Toaster position="top-right" />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/fixture" element={<Fixture />} />
            <Route path="/posiciones" element={<Standings />} />
            <Route path="/equipos" element={<Teams />} />
            <Route path="/equipos/:id" element={<TeamDetail />} />
            <Route path="/jugadores" element={<Players />} />
            <Route path="/jugadores/:id" element={<PlayerDetail />} />
            <Route path="/reservas" element={<Bookings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route
              path="/mis-reservas"
              element={<ProtectedRoute><MyBookings /></ProtectedRoute>}
            />
          </Route>

          <Route
            path="/admin"
            element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="equipos" element={<AdminTeams />} />
            <Route path="jugadores" element={<AdminPlayers />} />
            <Route path="partidos" element={<AdminMatches />} />
            <Route path="inventario" element={<AdminInventory />} />
            <Route path="reservas" element={<AdminBookings />} />
            <Route path="carnets" element={<AdminCarnets />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
