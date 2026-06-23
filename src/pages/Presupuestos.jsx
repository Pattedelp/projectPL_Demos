import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, FileText, Download, CheckCircle, XCircle, Clock } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const ESTADOS = {
  pendiente: { label: "Pendiente", color: "text-yellow-400 bg-yellow-500/10", icon: Clock },
  aprobado: { label: "Aprobado", color: "text-green-400 bg-green-500/10", icon: CheckCircle },
  rechazado: { label: "Rechazado", color: "text-red-400 bg-red-500/10", icon: XCircle },
}

function Presupuestos() {
  const { negocio } = useAuth()
  const { sucursalActual } = useSucursal()
  const [presupuestos, setPresupuestos] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [open, setOpen] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [clienteId, setClienteId] = useState("")
  const [nota, setNota] = useState("")
  const [items, setItems] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState("")
  const [cantidad, setCantidad] = useState("1")

  useEffect(() => {
    if (negocio && sucursalActual) {
      obtenerTodo()
    }
  }, [negocio, sucursalActual])

  async function obtenerTodo() {
    setCargando(true)

    const { data: dataPresupuestos } = await supabase
      .from("presupuestos")
      .select("*, clientes(nombre), presupuesto_items(*, productos(nombre))")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false })

    const { data: dataClientes } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    const { data: dataProductos } = await supabase
      .from("productos")
      .select("id, nombre, precio")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    setPresupuestos(dataPresupuestos || [])
    setClientes(dataClientes || [])
    setProductos(dataProductos || [])
    setCargando(false)
  }

  function agregarItem() {
    if (!productoSeleccionado || !cantidad || Number(cantidad) <= 0) return
    const producto = productos.find((p) => p.id === productoSeleccionado)
    if (!producto) return

    const yaExiste = items.find((i) => i.producto_id === producto.id)
    if (yaExiste) {
      setItems(items.map((i) =>
        i.producto_id === producto.id
          ? { ...i, cantidad: i.cantidad + Number(cantidad) }
          : i
      ))
    } else {
      setItems([...items, {
        producto_id: producto.id,
        nombre_producto: producto.nombre,
        precio_unitario: producto.precio,
        cantidad: Number(cantidad),
      }])
    }
    setProductoSeleccionado("")
    setCantidad("1")
  }

  function quitarItem(producto_id) {
    setItems(items.filter((i) => i.producto_id !== producto_id))
  }

  const total = items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)

  function resetForm() {
    setClienteId("")
    setNota("")
    setItems([])
    setProductoSeleccionado("")
    setCantidad("1")
  }

  async function handleGuardar() {
    if (items.length === 0) {
      alert("Agregá al menos un producto")
      return
    }
    setGuardando(true)

    const { data: presupuesto, error } = await supabase
      .from("presupuestos")
      .insert([{
        negocio_id: negocio.id,
        sucursal_id: sucursalActual.id,
        cliente_id: clienteId || null,
        total,
        nota: nota || null,
        estado: "pendiente",
      }])
      .select()
      .single()

    if (error) {
      alert("Error al guardar el presupuesto")
      setGuardando(false)
      return
    }

    await supabase.from("presupuesto_items").insert(
      items.map((i) => ({
        presupuesto_id: presupuesto.id,
        producto_id: i.producto_id,
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      }))
    )

    resetForm()
    setOpen(false)
    obtenerTodo()
    setGuardando(false)
  }

  async function cambiarEstado(id, estado) {
    await supabase.from("presupuestos").update({ estado }).eq("id", id)
    setPresupuestos(presupuestos.map((p) => p.id === id ? { ...p, estado } : p))
  }

  function exportarPDF(presupuesto) {
    const doc = new jsPDF()
    const fecha = new Date(presupuesto.created_at).toLocaleDateString("es-AR")
    const numero = presupuesto.id.substring(0, 8).toUpperCase()

    // Header
    doc.setFontSize(22)
    doc.setTextColor(30, 30, 30)
    doc.text("Workpilot", 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(negocio?.nombre || "", 14, 28)
    if (negocio?.telefono) doc.text(`Tel: ${negocio.telefono}`, 14, 34)
    if (negocio?.direccion) doc.text(negocio.direccion, 14, 40)

    // Título presupuesto
    doc.setFontSize(16)
    doc.setTextColor(30, 30, 30)
    doc.text("PRESUPUESTO", 140, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Nº: ${numero}`, 140, 28)
    doc.text(`Fecha: ${fecha}`, 140, 34)
    doc.text(`Estado: ${ESTADOS[presupuesto.estado]?.label || presupuesto.estado}`, 140, 40)

    doc.setDrawColor(200, 200, 200)
    doc.line(14, 48, 196, 48)

    // Cliente
    if (presupuesto.clientes?.nombre) {
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      doc.text("Cliente:", 14, 56)
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.text(presupuesto.clientes.nombre, 14, 62)
    }

    // Tabla de productos
    autoTable(doc, {
      startY: presupuesto.clientes?.nombre ? 70 : 56,
      head: [["Producto", "Cantidad", "Precio unitario", "Subtotal"]],
      body: presupuesto.presupuesto_items?.map((item) => [
        item.nombre_producto || item.productos?.nombre || "",
        item.cantidad,
        `$${Number(item.precio_unitario).toLocaleString("es-AR")}`,
        `$${(item.cantidad * item.precio_unitario).toLocaleString("es-AR")}`,
      ]) || [],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    })

    // Total
    const finalY = doc.lastAutoTable.finalY
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text("TOTAL:", 140, finalY + 12)
    doc.setFontSize(14)
    doc.text(`$${Number(presupuesto.total).toLocaleString("es-AR")}`, 196, finalY + 12, { align: "right" })

    // Nota
    if (presupuesto.nota) {
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Nota: ${presupuesto.nota}`, 14, finalY + 24)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Este presupuesto tiene validez de 15 días desde su emisión.", 14, 285)
    doc.text("Workpilot — Sistema de Gestión Comercial", 196, 285, { align: "right" })

    doc.save(`presupuesto_${numero}_${fecha.replace(/\//g, "-")}.pdf`)
  }

  const selectClass = "w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuestos</h1>
          <p className="text-muted-foreground mt-1">Generá y gestioná presupuestos para tus clientes.</p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus size={18} className="mr-2" />Nuevo presupuesto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear presupuesto</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label>Cliente (opcional)</Label>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={selectClass}>
                  <option value="">Sin cliente asignado</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="border-t border-border pt-4">
                <Label>Agregar productos</Label>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_4.5rem_5.5rem] gap-2 mt-1">
                  <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} className={`min-w-0 ${selectClass}`}>
                    <option value="">Producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — ${Number(p.precio).toLocaleString("es-AR")}</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                    className="w-full min-w-0 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
                  <Button type="button" onClick={agregarItem}>Agregar</Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.producto_id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-foreground text-sm font-medium">{i.nombre_producto}</p>
                        <p className="text-muted-foreground text-xs">
                          {i.cantidad} x ${Number(i.precio_unitario).toLocaleString("es-AR")} = ${(i.cantidad * i.precio_unitario).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <button onClick={() => quitarItem(i.producto_id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Nota (opcional)</Label>
                <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Válido por 15 días" />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground text-xl font-bold">${total.toLocaleString("es-AR")}</span>
              </div>

              <Button className="w-full" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar presupuesto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : presupuestos.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay presupuestos generados.</p>
      ) : (
        <div className="space-y-3">
          {presupuestos.map((p) => {
            const estado = ESTADOS[p.estado] || ESTADOS.pendiente
            const EstadoIcon = estado.icon
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={15} className="text-primary" />
                      <span className="text-foreground font-semibold">
                        {p.clientes?.nombre || "Sin cliente"}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${estado.color}`}>
                        <EstadoIcon size={11} />
                        {estado.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {new Date(p.created_at).toLocaleDateString("es-AR")} · Nº {p.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className="text-foreground font-bold text-lg">
                    ${Number(p.total).toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.presupuesto_items?.map((item) => (
                    <span key={item.id} className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-md">
                      {item.cantidad}x {item.nombre_producto || item.productos?.nombre}
                    </span>
                  ))}
                </div>

                {p.nota && (
                  <p className="text-muted-foreground text-xs mb-3 italic">"{p.nota}"</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button variant="outline" className="text-xs h-8" onClick={() => exportarPDF(p)}>
                    <Download size={13} className="mr-1.5" />PDF
                  </Button>
                  {p.estado === "pendiente" && (
                    <>
                      <button onClick={() => cambiarEstado(p.id, "aprobado")}
                        className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 transition-colors">
                        <CheckCircle size={12} /> Aprobar
                      </button>
                      <button onClick={() => cambiarEstado(p.id, "rechazado")}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 transition-colors">
                        <XCircle size={12} /> Rechazar
                      </button>
                    </>
                  )}
                  {p.estado !== "pendiente" && (
                    <button onClick={() => cambiarEstado(p.id, "pendiente")}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md bg-secondary transition-colors">
                      <Clock size={12} /> Volver a pendiente
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Presupuestos
