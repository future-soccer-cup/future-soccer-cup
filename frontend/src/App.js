import "@/index.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LoginModalProvider } from "./context/LoginModalContext";
import LoginModal from "./components/LoginModal";
import { Toaster } from "sonner";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Fixture from "./pages/Fixture";
import Standings from "./pages/Standings";
import Teams from "./pages/Teams";
import ClubDetail from "./pages/ClubDetail";
import TeamDetail from "./pages/TeamDetail";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import LoginRedirect from "./pages/LoginRedirect";
import Register from "./pages/Register";
import TeamRegister from "./pages/TeamRegister";
import MyTeam from "./pages/MyTeam";
import Cotizar from "./pages/Cotizar";
import MyQuotes from "./pages/MyQuotes";
import PaymentSuccess from "./pages/PaymentSuccess";
import Noticias from "./pages/Noticias";
import Bracket from "./pages/Bracket";
import DatosEstadisticas from "./pages/DatosEstadisticas";
import Nosotros from "./pages/Nosotros";
import Eventos from "./pages/Eventos";
import Contacto from "./pages/Contacto";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminPlayers from "./pages/admin/AdminPlayers";
import AdminMatches from "./pages/admin/AdminMatches";
import AdminCarnets from "./pages/admin/AdminCarnets";
import AdminFixtureGenerator from "./pages/admin/AdminFixtureGenerator";
import AdminBracketGenerator from "./pages/admin/AdminBracketGenerator";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminBulkUpload from "./pages/admin/AdminBulkUpload";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPasswordResets from "./pages/admin/AdminPasswordResets";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminHomeSettings from "./pages/admin/AdminHomeSettings";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminEventTypes from "./pages/admin/AdminEventTypes";
import AdminClubsTree from "./pages/admin/AdminClubsTree";

function PublicLayout() {
  const loc = useLocation();
  const hideChrome = loc.pathname.startsWith("/login") || loc.pathname.startsWith("/registro");
  const isHome = loc.pathname === "/";
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!isHome && <Navbar />}
      <Toaster position="top-right" />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideChrome && !isHome && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LoginModalProvider>
          <LoginModal />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/fixture" element={<Fixture />} />
            <Route path="/posiciones" element={<Standings />} />
            <Route path="/equipos" element={<Teams />} />
            <Route path="/clubes/:slug" element={<ClubDetail />} />
            <Route path="/equipos/:id" element={<TeamDetail />} />
            <Route path="/jugadores" element={<Players />} />
            <Route path="/jugadores/:id" element={<PlayerDetail />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/datos-estadisticas" element={<DatosEstadisticas />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/cotizar" element={<Cotizar />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/registro-equipo" element={<TeamRegister />} />
            <Route path="/recuperar-clave" element={<ForgotPassword />} />
            <Route path="/restablecer-clave" element={<ResetPassword />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
            <Route
              path="/mi-equipo"
              element={<ProtectedRoute role="team"><MyTeam /></ProtectedRoute>}
            />
            <Route
              path="/mis-cotizaciones"
              element={<ProtectedRoute><MyQuotes /></ProtectedRoute>}
            />
          </Route>

          <Route
            path="/admin"
            element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="equipos" element={<AdminTeams />} />
            <Route path="clubes" element={<AdminClubsTree />} />
            <Route path="jugadores" element={<AdminPlayers />} />
            <Route path="partidos" element={<AdminMatches />} />
            <Route path="generador-fixture" element={<AdminFixtureGenerator />} />
            <Route path="bracket" element={<AdminBracketGenerator />} />
            <Route path="torneos" element={<AdminTournaments />} />
            <Route path="galeria" element={<AdminGallery />} />
            <Route path="home" element={<AdminHomeSettings />} />
            <Route path="mensajes" element={<AdminMessages />} />
            <Route path="aprobaciones" element={<AdminApprovals />} />
            <Route path="carga-masiva" element={<AdminBulkUpload />} />
            <Route path="cotizaciones" element={<AdminQuotes />} />
            <Route path="pagos" element={<AdminPayments />} />
            <Route path="noticias" element={<AdminPosts />} />
            <Route path="inventario" element={<AdminInventory />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="tipos-evento" element={<AdminEventTypes />} />
            <Route path="recuperaciones" element={<AdminPasswordResets />} />
            <Route path="carnets" element={<AdminCarnets />} />
          </Route>
        </Routes>
        </LoginModalProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
