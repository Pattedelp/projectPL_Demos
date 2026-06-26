import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aplicarTema, cargarTemaLocal } from "@/lib/temas";
import { useEffect } from "react";

function Login({ onIrARegistro }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const errorLogin = await login(email, password);
    if (errorLogin) {
      setError("Email o contraseña incorrectos");
      setCargando(false);
    }
  }

  useEffect(() => {
    aplicarTema(cargarTemaLocal());
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex w-1/2 bg-sidebar flex-col items-center justify-center p-12 border-r border-border relative overflow-hidden">
        {/* Círculos decorativos de fondo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/workpilot_logo.png"
            alt="Workpilot"
            className="h-12 mb-6"
          />
          <p className="text-muted-foreground text-lg mb-12">
            Herramienta de tu día a día.
          </p>

          <div className="space-y-4 w-full max-w-xs">
            {[
              "Gestión de clientes y ventas",
              "Stock en tiempo real por sucursal",
              "Asistente con Inteligencia Artificial",
              "Acceso desde cualquier dispositivo",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-left">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-muted-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo solo en mobile (en desktop se ve en el panel izquierdo) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src="/workpilot_logo.png"
              alt="Workpilot"
              className="h-8 mb-3"
            />
            <p className="text-muted-foreground text-sm">
              Herramienta de tu día a día.
            </p>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">
            Bienvenido
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Ingresá a tu cuenta para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
            </Button>

            <button
              type="button"
              onClick={onIrARegistro}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ¿No tenés cuenta? Registrate
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
