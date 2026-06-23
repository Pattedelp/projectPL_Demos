import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Bell, AlertTriangle, ChevronDown, Users, Package } from "lucide-react"
import { useAlertas } from "@/hooks/useAlertas"
import { useSucursal } from "@/context/SucursalContext"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

function Topbar() {
  const { alertas } = useAlertas()
  const { sucursales, sucursalActual, setSucursalActual } = useSucursal()
  const { negocio } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [abrirSucursales, setAbrirSucursales] = useState(false)
  const [yaVistas, setYaVistas] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState({ clientes: [], productos: [] })
  const [buscando, setBuscando] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const busquedaRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!busqueda.trim() || busqueda.length < 2) {
      setResultados({ clientes: [], productos: [] })
      setMostrarResultados(false)
      return
    }

    const timeout = setTimeout(() => buscar(), 300)
    return () => clearTimeout(timeout)
  }, [busqueda])

  async function buscar() {
    if (!negocio) return
    setBuscando(true)

    const [{ data: clientes }, { data: productos }] = await Promise.all([
      supabase
        .from("clientes")
        .select("id, nombre, telefono")
        .eq("negocio_id", negocio.id)
        .ilike("nombre", `%${busqueda}%`)
        .limit(5),
      supabase
        .from("productos")
        .select("id, nombre, precio")
        .eq("negocio_id", negocio.id)
        .ilike("nombre", `%${busqueda}%`)
        .limit(5),
    ])

    setResultados({ clientes: clientes || [], productos: productos || [] })
    setMostrarResultados(true)
    setBuscando(false)
  }

  function irA(ruta) {
    setBusqueda("")
    setMostrarResultados(false)
    navigate(ruta)
  }

  function toggleNotificaciones() {
    setAbierto(!abierto)
    if (!abierto) setYaVistas(true)
  }

  function irAProductos() {
    setAbierto(false)
    navigate("/productos")
  }

  const hayResultados = resultados.clientes.length > 0 || resultados.productos.length > 0

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 relative">

      {/* Buscador */}
      <div className="relative w-80" ref={busquedaRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onFocus={() => busqueda.length >= 2 && setMostrarResultados(true)}
          placeholder="Buscar clientes, productos..."
          className="w-full bg-secondary text-foreground text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary"
        />

        {mostrarResultados && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMostrarResultados(false)} />
            <div className="absolute top-11 left-0 w-full bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
              {buscando ? (
                <p className="text-muted-foreground text-sm px-4 py-3">Buscando...</p>
              ) : !hayResultados ? (
                <p className="text-muted-foreground text-sm px-4 py-3">Sin resultados para "{busqueda}"</p>
              ) : (
                <>
                  {resultados.clientes.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs px-4 py-2 border-b border-border flex items-center gap-1.5">
                        <Users size={11} /> Clientes
                      </p>
                      {resultados.clientes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => irA("/clientes")}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                        >
                          <span className="text-foreground text-sm">{c.nombre}</span>
                          {c.telefono && <span className="text-muted-foreground text-xs">{c.telefono}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {resultados.productos.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs px-4 py-2 border-b border-border flex items-center gap-1.5 border-t">
                        <Package size={11} /> Productos
                      </p>
                      {resultados.productos.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => irA("/productos")}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                        >
                          <span className="text-foreground text-sm">{p.nombre}</span>
                          <span className="text-muted-foreground text-xs">${Number(p.precio).toLocaleString("es-AR")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {sucursales.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setAbrirSucursales(!abrirSucursales)}
              className="flex items-center gap-2 text-sm text-foreground bg-secondary border border-border px-3 py-1.5 rounded-lg hover:border-muted-foreground transition-colors"
            >
              <span className="text-muted-foreground shrink-0">Sucursal:</span>
              <span className="max-w-32 truncate">{sucursalActual?.nombre || "Seleccionar"}</span>
              <ChevronDown size={14} className="text-muted-foreground shrink-0" />
            </button>

            {abrirSucursales && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAbrirSucursales(false)} />
                <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-muted-foreground text-xs">Sucursales</p>
                  </div>
                  {sucursales.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSucursalActual(s); setAbrirSucursales(false) }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        sucursalActual?.id === s.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={toggleNotificaciones}
            className="relative text-muted-foreground hover:text-foreground transition-colors active:scale-90"
          >
            <Bell size={20} className={alertas.length > 0 && !yaVistas ? "animar-campana" : ""} />
            {alertas.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full"></span>
            )}
          </button>

          {abierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
              <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-foreground font-medium text-sm">Notificaciones</p>
                </div>
                {alertas.length === 0 ? (
                  <p className="text-muted-foreground text-sm px-4 py-6 text-center">No tenés alertas pendientes.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {alertas.map((alerta) => (
                      <button key={alerta.id} onClick={irAProductos}
                        className="w-full flex items-start gap-2 px-4 py-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-0">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                        <span className="text-foreground text-sm">{alerta.texto}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar