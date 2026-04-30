import Logo from "./Logo";
import { Mail, Phone, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16 fsc-stripe-blue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="bg-white rounded-md p-2 inline-block mb-4">
            <Logo className="h-12 w-12" />
          </div>
          <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
            La copa oficial del fútbol infantil y juvenil. Donde nace el futuro del deporte.
          </p>
        </div>

        <div>
          <h4 className="font-display font-bold uppercase tracking-wider text-white mb-3 text-sm">Torneo</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/fixture" className="hover:text-white">Fixture</a></li>
            <li><a href="/posiciones" className="hover:text-white">Tabla de posiciones</a></li>
            <li><a href="/equipos" className="hover:text-white">Equipos</a></li>
            <li><a href="/jugadores" className="hover:text-white">Jugadores</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold uppercase tracking-wider text-white mb-3 text-sm">Familias</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/cotizar" className="hover:text-white">Hospedaje</a></li>
            <li><a href="/cotizar" className="hover:text-white">Transporte</a></li>
            <li><a href="/cotizar" className="hover:text-white">Tours</a></li>
            <li><a href="/registro" className="hover:text-white">Cuenta familiar</a></li>
            <li><a href="/registro-equipo" className="hover:text-white">Registrar equipo</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold uppercase tracking-wider text-white mb-3 text-sm">Contacto</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Mail size={16}/> info@futuresoccercup.com</li>
            <li className="flex items-center gap-2"><Phone size={16}/> +1 (000) 000-0000</li>
            <li className="flex items-center gap-2"><Instagram size={16}/> @futuresoccercup</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex justify-between">
          <span>© {new Date().getFullYear()} Future Soccer Cup. Todos los derechos reservados.</span>
          <span className="font-display tracking-widest">FSC · 2025</span>
        </div>
      </div>
    </footer>
  );
}
