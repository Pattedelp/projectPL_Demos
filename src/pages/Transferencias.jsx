import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ArrowLeftRight, CheckCircle, AlertTriangle } from "lucide-react"

function Transferencias() {
  const { negocio } = useAuth()
  const { sucursales } = useSucursal()
  const [productos, setProductos] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    producto_id: "",
    sucursal_origen_id: "",
    sucursal_destino_id: "",
    cantidad: "",
    nota: "",
  })

  const [stockOrigen, setStockOrigen] = useState(null)

  useEffect(() => {
    if (negocio) {
      obtenerTodo()
    }
  }, [negocio])

  async function obtenerTodo() {
    setCargando(true)

    const { data: dataProductos } = await supabase
      .from("productos")
      .select("id, nombre")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    const { data: dataHistorial } = await supabase
      .from("transferencias_stock")
      .select(`
        *,
        productos(nombre),
        sucursal_origen:sucursales!transferencias_stock_sucursal_origen_id_fkey(nombre),
        sucursal_destino:sucursales!transferencias_stock_sucursal_destino_id_fkey(nombre)
      `)
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false })
      .limit(20)

    setProductos(dataProductos || [])
    setHistorial(dataHistorial || [])
    setCargando(false)
  }

  async function obtenerStockOrigen(productoId, sucursalId) {
    if (!productoId || !sucursalId) { setStockOrigen(null); return }

    const { data } = await supabase
      .from("stock_sucursal")
      .select("stock")
      .eq("producto_id", productoId)
      .eq("sucursal_id", sucursalId)
      .single()

    setStockOrigen(data?.stock ?? 0)
  }

  function handleChange(e) {
    const { name, value } = e.target
    const nuevoForm = { ...form, [name]: value }
    setForm(nuevoForm)

    if (name === "producto_id" || name === "sucursal_origen_id") {
      obtenerStockOrigen(
        name === "producto_id" ? value : form.producto_id,
        name === "sucursal_origen_id" ? value : form.sucursal_origen_id
      )
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setExito(false)

    const cantidad = parseInt(form.cantidad)

    if (form.sucursal_origen_id === form.sucursal_destino_id) {
      setError("La sucursal de origen y destino no pueden ser la misma.")
      return
    }
    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0.")
      return
    }
    if (stockOrigen !== null && cantidad > stockOrigen) {
      setError(`No hay suficiente stock. Disponible en origen: ${stockOrigen} unidades.`)
      return
    }

    setGuardando(true)

    // Descontar stock en origen
    const { data: stockOrigenData } = await supabase
      .from("stock_sucursal")
      .select("stock")
      .eq("producto_id", form.producto_id)
      .eq("sucursal_id", form.sucursal_origen_id)
      .single()

    const nuevoStockOrigen = (stockOrigenData?.stock || 0) - cantidad

    await supabase
      .from("stock_sucursal")
      .update({ stock: nuevoStockOrigen })
      .eq("producto_id", form.producto_id)
      .eq("sucursal_id", form.sucursal_origen_id)

    // Sumar stock en destino (upsert por si no existe)
    const { data: stockDestinoData } = await supabase
      .from("stock_sucursal")
      .select("stock, stock_minimo")
      .eq("producto_id", form.producto_id)
      .eq("sucursal_id", form.sucursal_destino_id)
      .single()

    const nuevoStockDestino = (stockDestinoData?.stock || 0) + cantidad

    await supabase
      .from("stock_sucursal")
      .upsert({
        producto_id: form.producto_id,
        sucursal_id: form.sucursal_destino_id,
        stock: nuevoStockDestino,
        stock_minimo: stockDestinoData?.stock_minimo || 5,
      }, { onConflict: "producto_id,sucursal_id" })

    // Registrar en historial
    await supabase.from("transferencias_stock").insert([{
      negocio_id: negocio.id,
      producto_id: form.producto_id,
      sucursal_origen_id: form.sucursal_origen_id,
      sucursal_destino_id: form.sucursal_destino_id,
      cantidad,
      nota: form.nota || null,
    }])

    setForm({
      producto_id: "",
      sucursal_origen_id: "",
      sucursal_destino_id: "",
      cantidad: "",
      nota: "",
    })
    setStockOrigen(null)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
    obtenerTodo()
    setGuardando(false)
  }

  const selectClass = "w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-foreground">Transferencias de stock</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Mové productos entre sucursales manteniendo el inventario actualizado.
      </p>

      {sucursales.length < 2 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <ArrowLeftRight className="text-muted-foreground mx-auto mb-3" size={32} />
          <p className="text-foreground font-medium mb-1">Necesitás al menos 2 sucursales</p>
          <p className="text-muted-foreground text-sm">
            Creá más sucursales desde Configuración para poder transferir stock entre ellas.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-lg p-5 mb-6">
            <h2 className="text-foreground font-semibold mb-4">Nueva transferencia</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Producto</Label>
                <select name="producto_id" value={form.producto_id} onChange={handleChange} required className={selectClass}>
                  <option value="">Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sucursal origen</Label>
                  <select name="sucursal_origen_id" value={form.sucursal_origen_id} onChange={handleChange} required className={selectClass}>
                    <option value="">Origen...</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  {stockOrigen !== null && (
                    <p className="text-muted-foreground text-xs mt-1">
                      Stock disponible: <span className={`font-medium ${stockOrigen === 0 ? "text-red-400" : "text-foreground"}`}>{stockOrigen} unidades</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Sucursal destino</Label>
                  <select name="sucursal_destino_id" value={form.sucursal_destino_id} onChange={handleChange} required className={selectClass}>
                    <option value="">Destino...</option>
                    {sucursales
                      .filter((s) => s.id !== form.sucursal_origen_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad a transferir</Label>
                  <Input
                    name="cantidad"
                    type="number"
                    min="1"
                    value={form.cantidad}
                    onChange={handleChange}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label>Nota (opcional)</Label>
                  <Input
                    name="nota"
                    value={form.nota}
                    onChange={handleChange}
                    placeholder="Ej: Reposición semanal"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              {exito && (
                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 px-3 py-2 rounded-lg">
                  <CheckCircle size={14} />
                  Transferencia realizada correctamente
                </div>
              )}

              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando ? "Procesando..." : "Confirmar transferencia"}
              </Button>
            </form>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-foreground font-semibold mb-4">Historial reciente</h2>

            {cargando ? (
              <p className="text-muted-foreground text-sm">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-muted-foreground text-sm">Todavía no hay transferencias registradas.</p>
            ) : (
              <div className="space-y-2">
                {historial.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <ArrowLeftRight size={14} className="text-primary shrink-0" />
                      <div>
                        <p className="text-foreground text-sm font-medium">{t.productos?.nombre}</p>
                        <p className="text-muted-foreground text-xs">
                          {t.sucursal_origen?.nombre} → {t.sucursal_destino?.nombre}
                          {t.nota && ` · ${t.nota}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-foreground text-sm font-semibold">{t.cantidad} u.</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(t.created_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Transferencias
