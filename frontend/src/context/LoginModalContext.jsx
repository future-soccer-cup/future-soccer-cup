/**
 * Contexto global para mostrar/ocultar el modal de Ingreso (Iter68).
 * El botón INGRESO en cualquier parte del sitio dispara openLogin().
 */
import { createContext, useContext, useState, useCallback } from "react";

const LoginModalCtx = createContext({
  open: false,
  openLogin: () => {},
  closeLogin: () => {},
});

export function LoginModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);
  const closeLogin = useCallback(() => setOpen(false), []);
  return (
    <LoginModalCtx.Provider value={{ open, openLogin, closeLogin }}>
      {children}
    </LoginModalCtx.Provider>
  );
}

export function useLoginModal() {
  return useContext(LoginModalCtx);
}
