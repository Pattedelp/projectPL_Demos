import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"
import { Lock, BarChart2, TrendingUp, Package, Building2,Download } from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { Button } from "@/components/ui/button"

const PERIODOS = [
  { label: "Últimos 7 días", dias: 7 },
  { label: "Últimos 30 días", dias: 30 },
  { label: "Últimos 90 días", dias: 90 },
  { label: "Este año", dias: 365 },
]

function Reportes() {
  const { negocio } = useAuth()
  const { sucursalActual, sucursales } = useSucursal()
  const [cargando, setCargando] = useState(true)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(30)
  const [ventasPorDia, setVentasPorDia] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [ventasPorSucursal, setVentasPorSucursal] = useState([])
  const [resumen, setResumen] = useState({
    totalVentas: 0,
    cantidadVentas: 0,
    ticketPromedio: 0,
    productosMasVendidosCount: 0,
  })

  const tieneAcceso = negocio?.plan === "pro" || negocio?.plan === "premium"

  useEffect(() => {
    if (negocio && sucursalActual && tieneAcceso) {
      obtenerDatos()
    }
  }, [negocio, sucursalActual, periodoSeleccionado])

  async function obtenerDatos() {
    setCargando(true)

    const desde = new Date()
    desde.setDate(desde.getDate() - periodoSeleccionado)
    desde.setHours(0, 0, 0, 0)

    // Ventas del período para la sucursal activa
    const { data: dataVentas } = await supabase
      .from("ventas")
      .select("total, created_at, venta_items(cantidad, productos(nombre))")
      .eq("negocio_id", negocio.id)
      .eq("sucursal_id", sucursalActual.id)
      .gte("created_at", desde.toISOString())
      .order("created_at")

    // Agrupar ventas por día
    const porDia = {}
    dataVentas?.forEach((v) => {
      const fecha = new Date(v.created_at).toLocaleDateString("es-AR", {
        day: "2-digit", month: "2-digit"
      })
      if (!porDia[fecha]) porDia[fecha] = { fecha, total: 0, cantidad: 0 }
      porDia[fecha].total += Number(v.total)
      porDia[fecha].cantidad += 1
    })
    setVentasPorDia(Object.values(porDia))

    // Resumen general
    const totalVentas = dataVentas?.reduce((acc, v) => acc + Number(v.total), 0) || 0
    const cantidadVentas = dataVentas?.length || 0
    setResumen({
      totalVentas,
      cantidadVentas,
      ticketPromedio: cantidadVentas > 0 ? totalVentas / cantidadVentas : 0,
    })

    // Productos más vendidos
    const conteoProductos = {}
    dataVentas?.forEach((v) => {
      v.venta_items?.forEach((item) => {
        const nombre = item.productos?.nombre || "Desconocido"
        if (!conteoProductos[nombre]) conteoProductos[nombre] = 0
        conteoProductos[nombre] += item.cantidad
      })
    })
    const topProductos = Object.entries(conteoProductos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nombre, cantidad]) => ({ nombre: nombre.substring(0, 20), cantidad }))
    setProductosMasVendidos(topProductos)

    // Ventas por sucursal (si hay más de una)
    if (sucursales.length > 1) {
      const { data: dataTodasVentas } = await supabase
        .from("ventas")
        .select("total, sucursal_id, sucursales(nombre)")
        .eq("negocio_id", negocio.id)
        .gte("created_at", desde.toISOString())

      const porSucursal = {}
      dataTodasVentas?.forEach((v) => {
        const nombre = v.sucursales?.nombre || "Sin sucursal"
        if (!porSucursal[nombre]) porSucursal[nombre] = { nombre, total: 0, cantidad: 0 }
        porSucursal[nombre].total += Number(v.total)
        porSucursal[nombre].cantidad += 1
      })
      setVentasPorSucursal(Object.values(porSucursal))
    }

    setCargando(false)
  }

  if (!tieneAcceso) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Reportes</h1>
        <p className="text-muted-foreground mb-6">Análisis detallado de tu negocio.</p>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
          <Lock className="text-muted-foreground mb-3" size={32} />
          <p className="text-foreground font-medium mb-1">Disponible en el plan Pro y Premium</p>
          <p className="text-muted-foreground text-sm">Hablá con tu proveedor para upgradear.</p>
        </div>
      </div>
    )
  }

  function exportarPDF() {
  const doc = new jsPDF()
  const fecha = new Date().toLocaleDateString("es-AR")
  const periodoLabel = PERIODOS.find((p) => p.dias === periodoSeleccionado)?.label || ""

  // Header
  doc.setFontSize(20)
  doc.setTextColor(30, 30, 30)
  doc.text("Workpilot", 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(100, 100, 100)
  doc.text(`${negocio?.nombre || ""}  —  ${sucursalActual?.nombre || ""}`, 14, 28)
  doc.text(`Período: ${periodoLabel}  |  Generado: ${fecha}`, 14, 35)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 39, 196, 39)

  // Resumen
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text("Resumen del período", 14, 48)

  autoTable(doc, {
    startY: 52,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total facturado", `$${resumen.totalVentas.toLocaleString("es-AR")}`],
      ["Cantidad de ventas", resumen.cantidadVentas],
      ["Ticket promedio", `$${Math.round(resumen.ticketPromedio).toLocaleString("es-AR")}`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  })

  // Ventas por día
  if (ventasPorDia.length > 0) {
    const y = doc.lastAutoTable.finalY + 12
    doc.setFontSize(13)
    doc.text("Ventas por día", 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [["Fecha", "Total ventas", "Cant. ventas"]],
      body: ventasPorDia.map((v) => [
        v.fecha,
        `$${v.total.toLocaleString("es-AR")}`,
        v.cantidad,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
  }

  // Productos más vendidos
  if (productosMasVendidos.length > 0) {
    const y = doc.lastAutoTable.finalY + 12
    doc.setFontSize(13)
    doc.text("Productos más vendidos", 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [["Producto", "Unidades vendidas"]],
      body: productosMasVendidos.map((p) => [p.nombre, p.cantidad]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
  }

  // Comparativa sucursales
  if (ventasPorSucursal.length > 1) {
    const y = doc.lastAutoTable.finalY + 12
    doc.setFontSize(13)
    doc.text("Comparativa por sucursal", 14, y)

    autoTable(doc, {
      startY: y + 4,
      head: [["Sucursal", "Total ventas", "Cant. ventas"]],
      body: ventasPorSucursal.map((s) => [
        s.nombre,
        `$${s.total.toLocaleString("es-AR")}`,
        s.cantidad,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer en cada página
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Workpilot — Sistema de Gestión Comercial", 14, 290)
    doc.text(`Página ${i} de ${totalPaginas}`, 196, 290, { align: "right" })
  }

  const nombreArchivo = `reporte_${sucursalActual?.nombre?.replace(/\s/g, "_")}_${fecha.replace(/\//g, "-")}.pdf`
  doc.save(nombreArchivo)
}

  return (
    <div className="p-6">
     <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
        <Button onClick={exportarPDF} disabled={cargando}>
          <Download size={16} className="mr-2" />
          Exportar PDF
        </Button>
      </div>
      <p className="text-muted-foreground mb-6 flex items-center gap-1.5">
        <Building2 size={14} />
        <span className="text-foreground font-medium">{sucursalActual?.nombre}</span>
      </p>

      {/* Selector de período */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            onClick={() => setPeriodoSeleccionado(p.dias)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              periodoSeleccionado === p.dias
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando reportes...</p>
      ) : (
        <div className="space-y-6">

          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total facturado", valor: `$${resumen.totalVentas.toLocaleString("es-AR")}`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "Cantidad de ventas", valor: resumen.cantidadVentas, icon: BarChart2, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Ticket promedio", valor: `$${Math.round(resumen.ticketPromedio).toLocaleString("es-AR")}`, icon: Package, color: "text-yellow-400", bg: "bg-yellow-500/10" },
            ].map(({ label, valor, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-5">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={color} size={20} />
                </div>
                <p className="text-muted-foreground text-sm">{label}</p>
                <p className="text-foreground text-2xl font-bold mt-1">{valor}</p>
              </div>
            ))}
          </div>

          {/* Ventas por día */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-foreground font-semibold mb-1">Ventas por día</h2>
            <p className="text-muted-foreground text-xs mb-4">{sucursalActual?.nombre}</p>
            {ventasPorDia.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay ventas en este período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={ventasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Total"]}
                  />
                  <Line type="monotone" dataKey="total" stroke="var(--color-primary, #3b82f6)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Productos más vendidos */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-foreground font-semibold mb-1">Productos más vendidos</h2>
            <p className="text-muted-foreground text-xs mb-4">Top 10 — {sucursalActual?.nombre}</p>
            {productosMasVendidos.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay datos en este período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={productosMasVendidos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="nombre" type="category" stroke="#94a3b8" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                    formatter={(value) => [value, "Unidades vendidas"]}
                  />
                  <Bar dataKey="cantidad" fill="var(--color-primary, #3b82f6)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Comparativa por sucursal */}
          {sucursales.length > 1 && (
            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="text-foreground font-semibold mb-1">Comparativa por sucursal</h2>
              <p className="text-muted-foreground text-xs mb-4">Todas las sucursales — mismo período</p>
              {ventasPorSucursal.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay datos en este período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ventasPorSucursal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                      formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Total ventas"]}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Total ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cantidad" name="Cant. ventas" fill="var(--color-primary, #3b82f6)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default Reportes