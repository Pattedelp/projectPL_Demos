import { useState } from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  LogOut, Sparkles, Settings, Truck, Menu, X, BarChart2, ArrowLeftRight
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/transferencias", label: "Transferencias", icon: ArrowLeftRight },
  { to: "/proveedores", label: "Proveedores", icon: Truck },
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/reportes", label: "Reportes", icon: BarChart2 },
  { to: "/asistente", label: "Asistente IA", icon: Sparkles },
  { to: "/configuracion", label: "Configuración", icon: Settings },
]

function SidebarContent({ negocio, logout, esDueño, onClose }) {
  const linksVisibles = esDueño
    ? links
    : links.filter((l) => !["/", "/asistente", "/configuracion"].includes(l.to))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 px-2">
        <img src="/workpilot_logo.png" alt="Workpilot" className="h-7" />
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {linksVisibles.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
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

      <div className="mt-auto px-2 pt-4 border-t border-border">
        <p className="text-sm text-foreground font-medium truncate">
          {negocio?.nombre || "Mi negocio"}
        </p>
        <p className="text-xs text-muted-foreground capitalize mb-3">
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
    </div>
  )
}

function Sidebar() {
  const { negocio, logout, esDueño } = useAuth()
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      {/* Botón hamburguesa — solo visible en mobile */}
      <button
        onClick={() => setAbierto(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center bg-card border border-border rounded-lg text-foreground shadow-md"
      >
        <Menu size={18} />
      </button>

      {/* Overlay oscuro — solo en mobile cuando está abierto */}
      {abierto && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Sidebar mobile — se desliza desde la izquierda */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border p-4 z-50 transition-transform duration-300 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          negocio={negocio}
          logout={logout}
          esDueño={esDueño}
          onClose={() => setAbierto(false)}
        />
      </aside>

      {/* Sidebar desktop — siempre visible, posición fija normal */}
      <aside className="hidden lg:flex w-64 h-screen bg-sidebar border-r border-sidebar-border p-4 flex-col shrink-0">
        <SidebarContent
          negocio={negocio}
          logout={logout}
          esDueño={esDueño}
          onClose={null}
        />
      </aside>
    </>
  )
}

export default Sidebar