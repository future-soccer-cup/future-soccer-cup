/**
 * Ruta /login — abre el modal global y redirige inmediatamente a la home
 * (o a la ruta previa si la trae en location.state.from). El Ingreso ya no
 * es una página con URL propia, es un modal. Este componente existe para
 * compatibilidad con links internos que apuntaban a /login.
 */
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useLoginModal } from "../context/LoginModalContext";

export default function LoginRedirect() {
  const { openLogin } = useLoginModal();
  useEffect(() => { openLogin(); }, [openLogin]);
  return <Navigate to="/" replace />;
}
