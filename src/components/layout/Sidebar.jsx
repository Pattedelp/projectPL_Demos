import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Store,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/asistente", label: "Asistente IA", icon: Sparkles },
];

function Sidebar() {
  const { negocio, logout } = useAuth();

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <Store className="text-white" size={18} />
        </div>
        <h2 className="text-lg font-bold text-white">Mi CRM</h2>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-0.5"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 pt-4 border-t border-slate-800">
        <p className="text-sm text-white font-medium truncate">
          {negocio?.nombre || "Mi negocio"}
        </p>
        <p className="text-xs text-slate-500 mb-3">Plan Demo</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
