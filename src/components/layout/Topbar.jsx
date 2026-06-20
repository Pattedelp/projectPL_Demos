import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, AlertTriangle } from "lucide-react";
import { useAlertas } from "@/hooks/useAlertas";

function Topbar() {
  const { alertas } = useAlertas();
  const [abierto, setAbierto] = useState(false);
  const [yaVistas, setYaVistas] = useState(false);
  const navigate = useNavigate();

  function irAProductos() {
    setAbierto(false);
    navigate("/productos");
  }

  function toggleNotificaciones() {
    setAbierto(!abierto);
    if (!abierto) setYaVistas(true);
  }
  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 relative">
      <div className="relative w-80">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar clientes, productos..."
          className="w-full bg-secondary text-foreground text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="relative">
        <button
          onClick={toggleNotificaciones}
          className="relative text-muted-foreground hover:text-foreground transition-colors active:scale-90"
        >
          <Bell
            size={20}
            className={alertas.length > 0 && !yaVistas ? "animar-campana" : ""}
          />
          {alertas.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full"></span>
          )}
        </button>

        {abierto && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setAbierto(false)}
            ></div>
            <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-foreground font-medium text-sm">
                  Notificaciones
                </p>
              </div>

              {alertas.length === 0 ? (
                <p className="text-muted-foreground text-sm px-4 py-6 text-center">
                  No tenés alertas pendientes.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {alertas.map((alerta) => (
                    <button
                      key={alerta.id}
                      onClick={irAProductos}
                      className="w-full flex items-start gap-2 px-4 py-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-0"
                    >
                      <AlertTriangle
                        size={14}
                        className="text-red-400 mt-0.5 shrink-0"
                      />
                      <span className="text-foreground text-sm">
                        {alerta.texto}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;
