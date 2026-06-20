import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

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
    // Si funciona, el AuthContext detecta el cambio automáticamente
    // y App.jsx redirige solo. No hace falta hacer nada más acá.
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-3">
            <Store className="text-foreground" size={24} />
          </div>
          <h1 className="text-xl font-bold text-foreground">Iniciar sesión</h1>
          <p className="text-muted-foreground text-sm mt-1">Ingresá a tu CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
  );
}

export default Login;
