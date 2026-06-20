import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Lock } from "lucide-react";

const PREGUNTAS_SUGERIDAS = [
  "¿Qué productos se están por agotar?",
  "¿Cuál fue mi mejor cliente este mes?",
  "Dame un resumen general del negocio",
];

function AsistenteIA() {
  const { negocio } = useAuth();
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);

  const tieneAcceso = negocio?.plan === "premium";

  async function obtenerDatosNegocio() {
    const { data: productos } = await supabase
      .from("productos")
      .select("nombre, precio, stock, stock_minimo")
      .eq("negocio_id", negocio.id);

    const { data: clientes } = await supabase
      .from("clientes")
      .select("nombre")
      .eq("negocio_id", negocio.id);

    const { data: ventas } = await supabase
      .from("ventas")
      .select(
        "total, created_at, clientes(nombre), venta_items(cantidad, productos(nombre))",
      )
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      totalProductos: productos?.length || 0,
      totalClientes: clientes?.length || 0,
      productos,
      ventasRecientes: ventas,
    };
  }

  async function enviarPregunta(textoPregunta) {
    const preguntaFinal = textoPregunta || pregunta;
    if (!preguntaFinal.trim()) return;

    setMensajes((prev) => [...prev, { tipo: "usuario", texto: preguntaFinal }]);
    setPregunta("");
    setCargando(true);

    try {
      const datosNegocio = await obtenerDatosNegocio();

      const { data, error } = await supabase.functions.invoke("asistente-ia", {
        body: { pregunta: preguntaFinal, datosNegocio },
      });

      if (error) throw error;

      const textoRespuesta = data.error || data.respuesta;

      setMensajes((prev) => [...prev, { tipo: "ia", texto: textoRespuesta }]);
    } catch (err) {
      console.error(err);
      setMensajes((prev) => [
        ...prev,
        {
          tipo: "ia",
          texto: "Hubo un error al consultar el asistente. Probá de nuevo.",
        },
      ]);
    }
    setCargando(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    enviarPregunta();
  }

  if (!tieneAcceso) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Asistente IA
        </h1>
        <p className="text-muted-foreground mb-6">
          Consultas inteligentes sobre tu negocio.
        </p>

        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
          <Lock className="border-border mb-3" size={32} />
          <p className="text-foreground font-medium mb-1">
            Disponible en el plan Premium
          </p>
          <p className="text-muted-foreground text-sm">
            Hablá con tu proveedor para acceder al asistente con IA.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Preguntale lo que quieras sobre tu negocio.
      </p>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {mensajes.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {PREGUNTAS_SUGERIDAS.map((p) => (
              <button
                key={p}
                onClick={() => enviarPregunta(p)}
                className="text-sm bg-card border border-border text-muted-foreground px-3 py-2 rounded-lg hover:border-primary hover:text-foreground transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`max-w-lg ${m.tipo === "usuario" ? "ml-auto" : ""}`}
          >
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                m.tipo === "usuario"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {m.texto}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground max-w-lg">
            Pensando...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Preguntale algo a tu asistente..."
          className="flex-1 bg-card border border-border text-foreground text-sm rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" disabled={cargando}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}

export default AsistenteIA;
