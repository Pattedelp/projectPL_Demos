import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

function Registro({ onVolverALogin }) {
  const { registrar } = useAuth();
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setCargando(false);
      return;
    }

    const errorRegistro = await registrar(email, password, nombreNegocio);

    if (errorRegistro) {
      setError(errorRegistro.message || "Hubo un error al crear la cuenta");
      setCargando(false);
    } else {
      setExito(true);
      setCargando(false);
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center mb-4 mx-auto">
            <Store className="text-foreground" size={24} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            ¡Cuenta creada!
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Ya podés iniciar sesión con tu email y contraseña.
          </p>
          <Button onClick={onVolverALogin} className="w-full">
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-3">
            <Store className="text-foreground" size={24} />
          </div>
          <h1 className="text-xl font-bold text-foreground">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registrá tu negocio
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombreNegocio">Nombre del negocio</Label>
            <Input
              id="nombreNegocio"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej: Ferretería Don José"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </Button>

          <button
            type="button"
            onClick={onVolverALogin}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ¿Ya tenés cuenta? Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default Registro;
