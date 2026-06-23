import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"
import { Users, Package, AlertTriangle, DollarSign, Building2 } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { Lock } from "lucide-react"

function Dashboard() {
  const { negocio } = useAuth()
  const { sucursalActual, sucursales } = useSucursal()
  const [cargando, setCargando] = useState(true)
  const [totalClientes, setTotalClientes] = useState(0)
  const [stockSucursal, setStockSucursal] = useState([])
  const [ventasHoy, setVentasHoy] = useState(0)
  const [ventasPorSucursal, setVentasPorSucursal] = useState([])

  const tieneAccesoGrafico = negocio?.plan === "pro" || negocio?.plan === "premium"

  useEffect(() => {
    if (negocio && sucursalActual) {
      obtenerDatos()
    }
  }, [negocio, sucursalActual])

  async function obtenerDatos() {
    setCargando(true)

    // Total clientes del negocio
    const { count: cantClientes } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("negocio_id", negocio.id)

    // Stock de la sucursal activa
    const { data: dataStock } = await supabase
      .from("stock_sucursal")
      .select("stock, stock_minimo, productos(nombre, precio)")
      .eq("sucursal_id", sucursalActual.id)

    // Ventas de hoy en la sucursal activa
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const { data: dataVentasHoy } = await supabase
      .from("ventas")
      .select("total")
      .eq("negocio_id", negocio.id)
      .eq("sucursal_id", sucursalActual.id)
      .gte("created_at", hoy.toISOString())

    // Ventas por sucursal (vista general, solo si hay más de una)
    if (sucursales.length > 1) {
      const { data: dataVentasSucursales } = await supabase
        .from("ventas")
        .select("total, sucursal_id, sucursales(nombre)")
        .eq("negocio_id", negocio.id)

      const agrupado = {}
      dataVentasSucursales?.forEach((v) => {
        const nombre = v.sucursales?.nombre || "Sin sucursal"
        if (!agrupado[nombre]) agrupado[nombre] = 0
        agrupado[nombre] += Number(v.total)
      })
      setVentasPorSucursal(
        Object.entries(agrupado).map(([nombre, total]) => ({ nombre, total }))
      )
    }

    setTotalClientes(cantClientes || 0)
    setStockSucursal(dataStock || [])
    setVentasHoy(dataVentasHoy?.reduce((acc, v) => acc + Number(v.total), 0) || 0)
    setCargando(false)
  }

  const stockBajo = stockSucursal.filter((s) => s.stock <= s.stock_minimo).length
  const valorInventario = stockSucursal.reduce(
    (acc, s) => acc + (s.productos?.precio || 0) * s.stock, 0
  )

  const datosGrafico = stockSucursal
    .slice(0, 8)
    .map((s) => ({
      nombre: s.productos?.nombre?.substring(0, 12) + (s.productos?.nombre?.length > 12 ? "..." : "") || "—",
      stock: s.stock,
      minimo: s.stock_minimo,
    }))

  const tarjetas = [
    {
      titulo: "Clientes",
      valor: totalClientes,
      icono: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      descripcion: "Total del negocio",
    },
    {
      titulo: "Ventas hoy",
      valor: `$${ventasHoy.toLocaleString("es-AR")}`,
      icono: DollarSign,
      color: "text-green-400",
      bg: "bg-green-500/10",
      descripcion: sucursalActual?.nombre,
    },
    {
      titulo: "Stock bajo",
      valor: stockBajo,
      icono: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      descripcion: sucursalActual?.nombre,
    },
    {
      titulo: "Valor inventario",
      valor: `$${valorInventario.toLocaleString("es-AR")}`,
      icono: Package,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      descripcion: sucursalActual?.nombre,
    },
  ]

  if (cargando) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {negocio?.nombre}
        </h1>
      </div>
      <p className="text-muted-foreground mb-6 flex items-center gap-1.5">
        <Building2 size={14} />
        Mostrando datos de: <span className="text-foreground font-medium">{sucursalActual?.nombre}</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tarjetas.map(({ titulo, valor, icono: Icono, color, bg, descripcion }) => (
          <div
            key={titulo}
            className="bg-card border border-border rounded-lg p-5"
          >
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icono className={color} size={20} />
            </div>
            <p className="text-muted-foreground text-sm">{titulo}</p>
            <p className="text-foreground text-2xl font-bold mt-1">{valor}</p>
            {descripcion && (
              <p className="text-muted-foreground text-xs mt-1 truncate">{descripcion}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-foreground font-semibold mb-1">
            Stock por producto
          </h2>
          <p className="text-muted-foreground text-xs mb-4">
            {sucursalActual?.nombre}
          </p>

          {!tieneAccesoGrafico ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Lock className="text-muted-foreground mb-3" size={28} />
              <p className="text-foreground text-sm mb-1">
                Disponible en el plan Pro
              </p>
              <p className="text-muted-foreground text-xs">
                Hablá con tu proveedor para upgradear
              </p>
            </div>
          ) : datosGrafico.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay productos cargados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card, #1e293b)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar dataKey="stock" name="Stock actual" fill="var(--color-primary, #3b82f6)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="minimo" name="Mínimo" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {sucursales.length > 1 && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-foreground font-semibold mb-1">
              Ventas totales por sucursal
            </h2>
            <p className="text-muted-foreground text-xs mb-4">
              Acumulado histórico
            </p>
            {ventasPorSucursal.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay ventas registradas todavía.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ventasPorSucursal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card, #1e293b)",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Total ventas"]}
                  />
                  <Bar dataKey="total" name="Ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard