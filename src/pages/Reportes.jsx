import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"
import { Lock, BarChart2, TrendingUp, Package, Building2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const PERIODOS = [
  { label: "7 días", dias: 7 },
  { label: "30 días", dias: 30 },
  { label: "90 días", dias: 90 },
  { label: "Este año", dias: 365 },
]

const TABS = [
  { id: "ventas", label: "Ventas", plan: "pro" },
  { id: "ranking", label: "Ranking productos", plan: "pro" },
  { id: "sucursales", label: "Sucursales", plan: "pro" },
  { id: "stock", label: "Stock valorizado", plan: "premium" },
  { id: "libro", label: "Libro de ventas", plan: "premium" },
]

function Reportes() {
  const { negocio } = useAuth()
  const { sucursalActual, sucursales } = useSucursal()
  const [cargando, setCargando] = useState(true)
  const [tabActiva, setTabActiva] = useState("ventas")
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(30)

  // Ventas
  const [ventasPorDia, setVentasPorDia] = useState([])
  const [resumen, setResumen] = useState({ totalVentas: 0, cantidadVentas: 0, ticketPromedio: 0 })
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [ventasPorSucursal, setVentasPorSucursal] = useState([])
  const [libroVentas, setLibroVentas] = useState([])

  // Stock
  const [stockValorizado, setStockValorizado] = useState([])

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

    const { data: dataVentas } = await supabase
      .from("ventas")
      .select("total, created_at, clientes(nombre), venta_items(cantidad, precio_unitario, productos(nombre, categorias(nombre)))")
      .eq("negocio_id", negocio.id)
      .eq("sucursal_id", sucursalActual.id)
      .gte("created_at", desde.toISOString())
      .order("created_at")

    // Ventas por día
    const porDia = {}
    dataVentas?.forEach((v) => {
      const fecha = new Date(v.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
      if (!porDia[fecha]) porDia[fecha] = { fecha, total: 0, cantidad: 0 }
      porDia[fecha].total += Number(v.total)
      porDia[fecha].cantidad += 1
    })
    setVentasPorDia(Object.values(porDia))

    // Resumen
    const totalVentas = dataVentas?.reduce((acc, v) => acc + Number(v.total), 0) || 0
    const cantidadVentas = dataVentas?.length || 0
    setResumen({ totalVentas, cantidadVentas, ticketPromedio: cantidadVentas > 0 ? totalVentas / cantidadVentas : 0 })

    // Ranking productos
    const conteo = {}
    dataVentas?.forEach((v) => {
      v.venta_items?.forEach((item) => {
        const nombre = item.productos?.nombre || "Desconocido"
        if (!conteo[nombre]) conteo[nombre] = { cantidad: 0, total: 0 }
        conteo[nombre].cantidad += item.cantidad
        conteo[nombre].total += item.cantidad * item.precio_unitario
      })
    })
    setProductosMasVendidos(
      Object.entries(conteo)
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 10)
        .map(([nombre, data]) => ({ nombre: nombre.substring(0, 20), ...data }))
    )

    // Libro de ventas (detalle por venta)
    setLibroVentas(dataVentas || [])

    // Comparativa sucursales
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

    // Stock valorizado
    const { data: dataStock } = await supabase
      .from("stock_sucursal")
      .select("stock, productos(nombre, precio, categorias(nombre))")
      .eq("sucursal_id", sucursalActual.id)
      .order("stock", { ascending: false })
    setStockValorizado(dataStock || [])

    setCargando(false)
  }

  // ── PDF helpers ──────────────────────────────────────────────────────────────
  function pdfHeader(doc, titulo) {
    const fecha = new Date().toLocaleDateString("es-AR")
    const periodoLabel = PERIODOS.find((p) => p.dias === periodoSeleccionado)?.label || ""
    doc.setFontSize(18); doc.setTextColor(30, 30, 30)
    doc.text("Workpilot", 14, 18)
    doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text(`${negocio?.nombre || ""}  —  ${sucursalActual?.nombre || ""}`, 14, 26)
    doc.text(`${titulo}  |  Período: ${periodoLabel}  |  ${fecha}`, 14, 32)
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 36, 196, 36)
    return 44
  }

  function pdfFooter(doc) {
    const total = doc.internal.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(8); doc.setTextColor(150, 150, 150)
      doc.text("Workpilot — Sistema de Gestión Comercial", 14, 290)
      doc.text(`Página ${i} de ${total}`, 196, 290, { align: "right" })
    }
  }

  function exportarVentasPDF() {
    const doc = new jsPDF()
    const startY = pdfHeader(doc, "Reporte de Ventas")
    autoTable(doc, {
      startY,
      head: [["Fecha", "Cliente", "Total"]],
      body: libroVentas.map((v) => [
        new Date(v.created_at).toLocaleDateString("es-AR"),
        v.clientes?.nombre || "Consumidor final",
        `$${Number(v.total).toLocaleString("es-AR")}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    const y = doc.lastAutoTable.finalY + 8
    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
    doc.text(`Total: $${resumen.totalVentas.toLocaleString("es-AR")}  |  Ventas: ${resumen.cantidadVentas}  |  Ticket prom.: $${Math.round(resumen.ticketPromedio).toLocaleString("es-AR")}`, 14, y)
    pdfFooter(doc)
    doc.save(`ventas_${sucursalActual?.nombre?.replace(/\s/g, "_")}.pdf`)
  }

  function exportarStockPDF() {
    const doc = new jsPDF()
    const startY = pdfHeader(doc, "Stock Valorizado")
    const total = stockValorizado.reduce((acc, s) => acc + s.stock * (s.productos?.precio || 0), 0)
    autoTable(doc, {
      startY,
      head: [["Producto", "Categoría", "Stock", "Precio unit.", "Valor total"]],
      body: stockValorizado.map((s) => [
        s.productos?.nombre || "—",
        s.productos?.categorias?.nombre || "Sin categoría",
        s.stock,
        `$${Number(s.productos?.precio || 0).toLocaleString("es-AR")}`,
        `$${(s.stock * (s.productos?.precio || 0)).toLocaleString("es-AR")}`,
      ]),
      foot: [["", "", "", "TOTAL", `$${total.toLocaleString("es-AR")}`]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      footStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: 14, right: 14 },
    })
    pdfFooter(doc)
    doc.save(`stock_valorizado_${sucursalActual?.nombre?.replace(/\s/g, "_")}.pdf`)
  }

  function exportarRankingPDF() {
    const doc = new jsPDF()
    const startY = pdfHeader(doc, "Ranking de Productos")
    autoTable(doc, {
      startY,
      head: [["#", "Producto", "Unidades vendidas", "Total facturado"]],
      body: productosMasVendidos.map((p, i) => [
        i + 1,
        p.nombre,
        p.cantidad,
        `$${p.total.toLocaleString("es-AR")}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    pdfFooter(doc)
    doc.save(`ranking_productos_${sucursalActual?.nombre?.replace(/\s/g, "_")}.pdf`)
  }

  function exportarLibroPDF() {
    const doc = new jsPDF()
    const startY = pdfHeader(doc, "Libro de Ventas")
    const rows = []
    libroVentas.forEach((v) => {
      v.venta_items?.forEach((item) => {
        rows.push([
          new Date(v.created_at).toLocaleDateString("es-AR"),
          v.clientes?.nombre || "Consumidor final",
          item.productos?.nombre || "—",
          item.cantidad,
          `$${Number(item.precio_unitario).toLocaleString("es-AR")}`,
          `$${(item.cantidad * item.precio_unitario).toLocaleString("es-AR")}`,
        ])
      })
    })
    autoTable(doc, {
      startY,
      head: [["Fecha", "Cliente", "Producto", "Cant.", "P. Unit.", "Subtotal"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    pdfFooter(doc)
    doc.save(`libro_ventas_${sucursalActual?.nombre?.replace(/\s/g, "_")}.pdf`)
  }

  function exportarSucursalesPDF() {
    const doc = new jsPDF()
    const startY = pdfHeader(doc, "Comparativa por Sucursal")
    autoTable(doc, {
      startY,
      head: [["Sucursal", "Cant. ventas", "Total facturado", "Ticket promedio"]],
      body: ventasPorSucursal.map((s) => [
        s.nombre,
        s.cantidad,
        `$${s.total.toLocaleString("es-AR")}`,
        `$${Math.round(s.total / (s.cantidad || 1)).toLocaleString("es-AR")}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    pdfFooter(doc)
    doc.save(`comparativa_sucursales.pdf`)
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
      </div>
      <p className="text-muted-foreground mb-4 flex items-center gap-1.5">
        <Building2 size={14} />
        <span className="text-foreground font-medium">{sucursalActual?.nombre}</span>
      </p>

      {/* Selector de período */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PERIODOS.map((p) => (
          <button key={p.dias} onClick={() => setPeriodoSeleccionado(p.dias)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              periodoSeleccionado === p.dias
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.filter((t) => t.id !== "sucursales" || sucursales.length > 1).map((tab) => {
          const esPremiumTab = tab.plan === "premium"
          const tieneAccesoTab = esPremiumTab
            ? negocio?.plan === "premium"
            : negocio?.plan === "pro" || negocio?.plan === "premium"
          return (
            <button key={tab.id}
              onClick={() => tieneAccesoTab && setTabActiva(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                !tieneAccesoTab
                  ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                  : tabActiva === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
              {!tieneAccesoTab && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  Premium
                </span>
              )}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando reporte...</p>
      ) : (
        <>
          {/* ── TAB VENTAS ── */}
          {tabActiva === "ventas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  {[
                    { label: "Total", valor: `$${resumen.totalVentas.toLocaleString("es-AR")}` },
                    { label: "Cantidad", valor: resumen.cantidadVentas },
                    { label: "Ticket prom.", valor: `$${Math.round(resumen.ticketPromedio).toLocaleString("es-AR")}` },
                  ].map(({ label, valor }) => (
                    <div key={label}>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="text-foreground font-bold text-lg">{valor}</p>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={exportarVentasPDF}>
                  <Download size={14} className="mr-2" />PDF
                </Button>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-foreground font-semibold mb-4">Evolución de ventas</h2>
                {ventasPorDia.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay ventas en este período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={ventasPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                        formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Total"]} />
                      <Line type="monotone" dataKey="total" stroke="var(--color-primary, #3b82f6)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* ── TAB STOCK VALORIZADO ── */}
          {tabActiva === "stock" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">Valor total del inventario</p>
                  <p className="text-foreground font-bold text-xl">
                    ${stockValorizado.reduce((acc, s) => acc + s.stock * (s.productos?.precio || 0), 0).toLocaleString("es-AR")}
                  </p>
                </div>
                <Button variant="outline" onClick={exportarStockPDF}>
                  <Download size={14} className="mr-2" />PDF
                </Button>
              </div>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {stockValorizado.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-5">No hay productos cargados.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left text-muted-foreground font-medium py-3 px-4">Producto</th>
                        <th className="text-left text-muted-foreground font-medium py-3 px-4">Categoría</th>
                        <th className="text-right text-muted-foreground font-medium py-3 px-4">Stock</th>
                        <th className="text-right text-muted-foreground font-medium py-3 px-4">Precio unit.</th>
                        <th className="text-right text-muted-foreground font-medium py-3 px-4">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockValorizado.map((s, i) => {
                        const valorTotal = s.stock * (s.productos?.precio || 0)
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-2.5 px-4 text-foreground">{s.productos?.nombre || "—"}</td>
                            <td className="py-2.5 px-4 text-muted-foreground">{s.productos?.categorias?.nombre || "Sin categoría"}</td>
                            <td className="py-2.5 px-4 text-foreground text-right">{s.stock}</td>
                            <td className="py-2.5 px-4 text-muted-foreground text-right">${Number(s.productos?.precio || 0).toLocaleString("es-AR")}</td>
                            <td className="py-2.5 px-4 text-foreground font-medium text-right">${valorTotal.toLocaleString("es-AR")}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/50">
                        <td colSpan={4} className="py-3 px-4 text-foreground font-semibold">Total inventario</td>
                        <td className="py-3 px-4 text-foreground font-bold text-right">
                          ${stockValorizado.reduce((acc, s) => acc + s.stock * (s.productos?.precio || 0), 0).toLocaleString("es-AR")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── TAB RANKING ── */}
          {tabActiva === "ranking" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={exportarRankingPDF}>
                  <Download size={14} className="mr-2" />PDF
                </Button>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-foreground font-semibold mb-4">Top 10 productos más vendidos</h2>
                {productosMasVendidos.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay datos en este período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={productosMasVendidos} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                      <YAxis dataKey="nombre" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                        formatter={(value, name) => [name === "cantidad" ? `${value} u.` : `$${value.toLocaleString("es-AR")}`, name === "cantidad" ? "Unidades" : "Total"]} />
                      <Bar dataKey="cantidad" fill="var(--color-primary, #3b82f6)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* ── TAB LIBRO DE VENTAS ── */}
          {tabActiva === "libro" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={exportarLibroPDF}>
                  <Download size={14} className="mr-2" />PDF
                </Button>
              </div>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {libroVentas.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-5">No hay ventas en este período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left text-muted-foreground font-medium py-3 px-4">Fecha</th>
                        <th className="text-left text-muted-foreground font-medium py-3 px-4">Cliente</th>
                        <th className="text-left text-muted-foreground font-medium py-3 px-4">Productos</th>
                        <th className="text-right text-muted-foreground font-medium py-3 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {libroVentas.map((v) => (
                        <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                            {new Date(v.created_at).toLocaleDateString("es-AR")}
                          </td>
                          <td className="py-2.5 px-4 text-foreground">{v.clientes?.nombre || "Consumidor final"}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {v.venta_items?.map((item, i) => (
                                <span key={i} className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                                  {item.cantidad}x {item.productos?.nombre}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-foreground font-medium text-right whitespace-nowrap">
                            ${Number(v.total).toLocaleString("es-AR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/50">
                        <td colSpan={3} className="py-3 px-4 text-foreground font-semibold">
                          Total — {libroVentas.length} ventas
                        </td>
                        <td className="py-3 px-4 text-foreground font-bold text-right">
                          ${resumen.totalVentas.toLocaleString("es-AR")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── TAB SUCURSALES ── */}
          {tabActiva === "sucursales" && sucursales.length > 1 && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={exportarSucursalesPDF}>
                  <Download size={14} className="mr-2" />PDF
                </Button>
              </div>
              <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-foreground font-semibold mb-4">Comparativa por sucursal</h2>
                {ventasPorSucursal.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay datos en este período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ventasPorSucursal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--color-card, #1e293b)", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }}
                        formatter={(value) => [`$${value.toLocaleString("es-AR")}`, "Total ventas"]} />
                      <Legend />
                      <Bar dataKey="total" name="Total ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cantidad" name="Cant. ventas" fill="var(--color-primary, #3b82f6)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Reportes
