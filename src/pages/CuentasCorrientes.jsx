import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CreditCard, Plus, TrendingDown, TrendingUp, ChevronDown, ChevronRight } from "lucide-react"

function CuentasCorrientes() {
  const { negocio } = useAuth()
  const [cuentas, setCuentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [movimientos, setMovimientos] = useState({})

  // Modal nuevo cargo/pago
  const [open, setOpen] = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null)
  const [tipoMovimiento, setTipoMovimiento] = useState("cargo")
  const [monto, setMonto] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [guardando, setGuardando] = useState(false)

  // Modal nueva cuenta
  const [openNueva, setOpenNueva] = useState(false)
  const [clienteNuevo, setClienteNuevo] = useState("")
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (negocio) obtenerTodo()
  }, [negocio])

  async function obtenerTodo() {
    setCargando(true)

    const { data: dataCuentas } = await supabase
      .from("cuentas_corrientes")
      .select("*, clientes(nombre, telefono, email)")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false })

    const { data: dataClientes } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("negocio_id", negocio.id)
      .order("nombre")

    setCuentas(dataCuentas || [])
    setClientes(dataClientes || [])
    setCargando(false)
  }

  async function obtenerMovimientos(cuentaId) {
    if (movimientos[cuentaId]) return
    const { data } = await supabase
      .from("movimientos_cc")
      .select("*")
      .eq("cuenta_corriente_id", cuentaId)
      .order("created_at", { ascending: false })
      .limit(20)
    setMovimientos((prev) => ({ ...prev, [cuentaId]: data || [] }))
  }

  function toggleExpandir(cuentaId) {
    if (expandida === cuentaId) {
      setExpandida(null)
    } else {
      setExpandida(cuentaId)
      obtenerMovimientos(cuentaId)
    }
  }

  async function crearCuenta(e) {
    e.preventDefault()
    if (!clienteNuevo) return
    setCreando(true)

    const { error } = await supabase
      .from("cuentas_corrientes")
      .insert([{ negocio_id: negocio.id, cliente_id: clienteNuevo, saldo: 0 }])

    if (error) {
      if (error.code === "23505") {
        alert("Este cliente ya tiene una cuenta corriente.")
      } else {
        alert("Error al crear la cuenta corriente.")
      }
    } else {
      setClienteNuevo("")
      setOpenNueva(false)
      obtenerTodo()
    }
    setCreando(false)
  }

  function abrirMovimiento(cuenta, tipo) {
    setCuentaSeleccionada(cuenta)
    setTipoMovimiento(tipo)
    setMonto("")
    setDescripcion("")
    setOpen(true)
  }

  async function guardarMovimiento(e) {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)

    const montoNum = parseFloat(monto)
    const nuevoSaldo = tipoMovimiento === "cargo"
      ? cuentaSeleccionada.saldo + montoNum
      : cuentaSeleccionada.saldo - montoNum

    const { error: errorMov } = await supabase
      .from("movimientos_cc")
      .insert([{
        cuenta_corriente_id: cuentaSeleccionada.id,
        tipo: tipoMovimiento,
        monto: montoNum,
        descripcion: descripcion || null,
      }])

    if (errorMov) {
      alert("Error al registrar el movimiento.")
      setGuardando(false)
      return
    }

    await supabase
      .from("cuentas_corrientes")
      .update({ saldo: nuevoSaldo })
      .eq("id", cuentaSeleccionada.id)

    setCuentas(cuentas.map((c) =>
      c.id === cuentaSeleccionada.id ? { ...c, saldo: nuevoSaldo } : c
    ))
    setMovimientos((prev) => ({
      ...prev,
      [cuentaSeleccionada.id]: [
        {
          id: Date.now(),
          tipo: tipoMovimiento,
          monto: montoNum,
          descripcion: descripcion || null,
          created_at: new Date().toISOString(),
        },
        ...(prev[cuentaSeleccionada.id] || []),
      ],
    }))

    setOpen(false)
    setGuardando(false)
  }

  const totalDeuda = cuentas.reduce((acc, c) => acc + Number(c.saldo), 0)
  const cuentasConDeuda = cuentas.filter((c) => c.saldo > 0).length

  const selectClass = "w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuentas Corrientes</h1>
          <p className="text-muted-foreground mt-1">
            Seguimiento de deudas y pagos de clientes.
          </p>
        </div>

        <Dialog open={openNueva} onOpenChange={setOpenNueva}>
          <DialogTrigger asChild>
            <Button><Plus size={18} className="mr-2" />Nueva cuenta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir cuenta corriente</DialogTitle>
            </DialogHeader>
            <form onSubmit={crearCuenta} className="space-y-4 mt-2">
              <div>
                <Label>Cliente</Label>
                <select value={clienteNuevo} onChange={(e) => setClienteNuevo(e.target.value)} required className={selectClass}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes
                    .filter((c) => !cuentas.find((cc) => cc.cliente_id === c.id))
                    .map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={creando}>
                {creando ? "Creando..." : "Abrir cuenta corriente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
            <CreditCard className="text-red-400" size={20} />
          </div>
          <p className="text-muted-foreground text-sm">Total adeudado</p>
          <p className="text-foreground text-2xl font-bold mt-1">
            ${totalDeuda.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
            <TrendingDown className="text-orange-400" size={20} />
          </div>
          <p className="text-muted-foreground text-sm">Clientes con deuda</p>
          <p className="text-foreground text-2xl font-bold mt-1">{cuentasConDeuda}</p>
        </div>
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : cuentas.length === 0 ? (
        <p className="text-muted-foreground">No hay cuentas corrientes abiertas todavía.</p>
      ) : (
        <div className="space-y-2">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => toggleExpandir(cuenta.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {expandida === cuenta.id
                    ? <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                    : <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="text-foreground font-medium">{cuenta.clientes?.nombre}</p>
                    {cuenta.clientes?.telefono && (
                      <p className="text-muted-foreground text-xs">{cuenta.clientes.telefono}</p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={`font-bold ${Number(cuenta.saldo) > 0 ? "text-red-400" : "text-green-400"}`}>
                      ${Number(cuenta.saldo).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => abrirMovimiento(cuenta, "cargo")}
                      className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <TrendingDown size={12} /> Cargo
                    </button>
                    <button
                      onClick={() => abrirMovimiento(cuenta, "pago")}
                      className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <TrendingUp size={12} /> Pago
                    </button>
                  </div>
                </div>
              </div>

              {expandida === cuenta.id && (
                <div className="border-t border-border px-4 py-3 bg-secondary/30">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                    Últimos movimientos
                  </p>
                  {!movimientos[cuenta.id] ? (
                    <p className="text-muted-foreground text-sm">Cargando...</p>
                  ) : movimientos[cuenta.id].length === 0 ? (
                    <p className="text-muted-foreground text-sm">Sin movimientos todavía.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {movimientos[cuenta.id].map((mov) => (
                        <div key={mov.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {mov.tipo === "cargo"
                              ? <TrendingDown size={13} className="text-red-400 shrink-0" />
                              : <TrendingUp size={13} className="text-green-400 shrink-0" />
                            }
                            <span className="text-foreground text-sm">
                              {mov.descripcion || (mov.tipo === "cargo" ? "Cargo" : "Pago")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${mov.tipo === "cargo" ? "text-red-400" : "text-green-400"}`}>
                              {mov.tipo === "cargo" ? "+" : "-"}${Number(mov.monto).toLocaleString("es-AR")}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {new Date(mov.created_at).toLocaleDateString("es-AR")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal cargo/pago */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tipoMovimiento === "cargo" ? "Registrar cargo" : "Registrar pago"}
              {cuentaSeleccionada && ` — ${cuentaSeleccionada.clientes?.nombre}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarMovimiento} className="space-y-4 mt-2">
            <div className="bg-secondary rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Saldo actual</span>
              <span className={`font-bold ${Number(cuentaSeleccionada?.saldo) > 0 ? "text-red-400" : "text-green-400"}`}>
                ${Number(cuentaSeleccionada?.saldo || 0).toLocaleString("es-AR")}
              </span>
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={tipoMovimiento === "cargo" ? "Ej: Venta del 23/06" : "Ej: Pago en efectivo"}
              />
            </div>
            {monto && Number(monto) > 0 && (
              <div className="bg-secondary rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Saldo resultante</span>
                <span className="text-foreground font-bold">
                  ${(
                    tipoMovimiento === "cargo"
                      ? Number(cuentaSeleccionada?.saldo || 0) + Number(monto)
                      : Number(cuentaSeleccionada?.saldo || 0) - Number(monto)
                  ).toLocaleString("es-AR")}
                </span>
              </div>
            )}
            <Button
              type="submit"
              className={`w-full ${tipoMovimiento === "pago" ? "bg-green-600 hover:bg-green-700" : ""}`}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : tipoMovimiento === "cargo" ? "Registrar cargo" : "Registrar pago"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CuentasCorrientes
