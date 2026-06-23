import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Sparkles, Send, Lock, Zap, RotateCcw } from "lucide-react"

const PREGUNTAS_SUGERIDAS = [
  "¿Qué productos se están por agotar?",
  "¿Cuánto vendimos esta semana?",
  "Dame un resumen general del negocio",
  "Transferí 5 unidades de [producto] a [sucursal]",
  "Creame un presupuesto para [cliente]",
]

function AsistenteIA() {
  const { negocio } = useAuth()
  const [pregunta, setPregunta] = useState("")
  const [mensajes, setMensajes] = useState([])
  const [historialAPI, setHistorialAPI] = useState([])
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef(null)

  const tieneAcceso = negocio?.plan === "premium"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes, cargando])

  async function obtenerDatosNegocio() {
    const { data: productos } = await supabase
      .from("productos")
      .select("nombre, precio")
      .eq("negocio_id", negocio.id)
      .limit(30)

    const { data: sucursales } = await supabase
      .from("sucursales")
      .select("nombre")
      .eq("negocio_id", negocio.id)

    const { data: clientes } = await supabase
      .from("clientes")
      .select("nombre")
      .eq("negocio_id", negocio.id)
      .limit(20)

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const { data: ventasHoy } = await supabase
      .from("ventas")
      .select("total")
      .eq("negocio_id", negocio.id)
      .gte("created_at", hoy.toISOString())

    const totalHoy = ventasHoy?.reduce((acc, v) => acc + Number(v.total), 0) || 0

    return {
      negocio: negocio.nombre,
      plan: negocio.plan,
      totalProductos: productos?.length || 0,
      totalClientes: clientes?.length || 0,
      sucursales: sucursales?.map((s) => s.nombre) || [],
      productos: productos?.map((p) => p.nombre) || [],
      clientes: clientes?.map((c) => c.nombre) || [],
      ventasHoy: `$${totalHoy.toLocaleString("es-AR")}`,
    }
  }

  async function enviarPregunta(textoPregunta) {
    const preguntaFinal = textoPregunta || pregunta
    if (!preguntaFinal.trim() || cargando) return

    const nuevoMensajeUsuario = { tipo: "usuario", texto: preguntaFinal }
    setMensajes((prev) => [...prev, nuevoMensajeUsuario])
    setPregunta("")
    setCargando(true)

    try {
      const datosNegocio = await obtenerDatosNegocio()

      const { data, error } = await supabase.functions.invoke("asistente-ia", {
        body: {
          pregunta: preguntaFinal,
          datosNegocio,
          negocioId: negocio.id,
          historial: historialAPI,
        },
      })

      if (error) throw error

      const textoRespuesta = data.error || data.respuesta
      const acciones = data.acciones || []

      // Actualizar historial para la próxima consulta
      setHistorialAPI((prev) => [
        ...prev,
        { role: "user", content: preguntaFinal },
        { role: "assistant", content: textoRespuesta },
      ])

      setMensajes((prev) => [
        ...prev,
        {
          tipo: "ia",
          texto: textoRespuesta,
          acciones,
        },
      ])
    } catch (err) {
      console.error(err)
      setMensajes((prev) => [
        ...prev,
        { tipo: "ia", texto: "Hubo un error al consultar el asistente. Probá de nuevo." },
      ])
    }
    setCargando(false)
  }

  function limpiarConversacion() {
    setMensajes([])
    setHistorialAPI([])
    setPregunta("")
  }

  function handleSubmit(e) {
    e.preventDefault()
    enviarPregunta()
  }

  if (!tieneAcceso) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Asistente IA</h1>
        <p className="text-muted-foreground mb-6">Consultas inteligentes sobre tu negocio.</p>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
          <Lock className="text-muted-foreground mb-3" size={32} />
          <p className="text-foreground font-medium mb-1">Disponible en el plan Premium</p>
          <p className="text-muted-foreground text-sm">Hablá con tu proveedor para acceder al asistente con IA.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={22} />
          <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
        </div>
        {mensajes.length > 0 && (
          <button
            onClick={limpiarConversacion}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={13} />
            Nueva conversación
          </button>
        )}
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Preguntá sobre tu negocio o pedile que ejecute acciones como transferir stock o crear presupuestos.
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {mensajes.length === 0 && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Sugerencias</p>
            <div className="flex flex-wrap gap-2">
              {PREGUNTAS_SUGERIDAS.map((p) => (
                <button
                  key={p}
                  onClick={() => enviarPregunta(p)}
                  className="text-sm bg-card border border-border text-muted-foreground px-3 py-2 rounded-lg hover:border-primary hover:text-foreground transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.tipo === "usuario" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-lg space-y-2 ${m.tipo === "usuario" ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.tipo === "usuario"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {m.texto}
              </div>

              {/* Acciones ejecutadas */}
              {m.acciones && m.acciones.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 w-full">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} className="text-green-400" />
                    <span className="text-green-400 text-xs font-medium">
                      {m.acciones.length} acción{m.acciones.length > 1 ? "es" : ""} ejecutada{m.acciones.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {m.acciones.map((a, j) => (
                    <p key={j} className="text-green-300 text-xs">
                      ✓ {a.herramienta.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              Pensando...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Preguntá o pedí una acción..."
          className="flex-1 bg-card border border-border text-foreground text-sm rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          disabled={cargando}
        />
        <Button type="submit" disabled={cargando || !pregunta.trim()}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  )
}

export default AsistenteIA