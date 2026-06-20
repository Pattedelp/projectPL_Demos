import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Store,
  LogOut,
  Sparkles,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/asistente", label: "Asistente IA", icon: Sparkles },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function Sidebar() {
  const { negocio, logout, esDueño } = useAuth();
  const linksVisibles = esDueño
    ? links
    : links.filter(
        (l) => !["/", "/asistente", "/configuracion"].includes(l.to),
      );
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Store className="text-foreground" size={18} />
        </div>
        <h2 className="text-lg font-bold text-foreground">Workpilot</h2>{" "}
      </div>

      <nav className="flex flex-col gap-1">
        {linksVisibles.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-card hover:text-foreground hover:translate-x-0.5"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 pt-4 border-t border-slate-800">
        <p className="text-sm text-foreground font-medium truncate">
          {negocio?.nombre || "Mi negocio"}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          Plan {negocio?.plan || "básico"}
        </p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
