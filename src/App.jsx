import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Productos from "@/pages/Productos";
import Ventas from "@/pages/Ventas";
import { useState } from "react";
import Registro from "@/pages/Registro";
import AsistenteIA from "@/pages/AsistenteIA";
import Configuracion from "@/pages/Configuracion";

function AppRoutes() {
  const { user, cargando } = useAuth();
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  if (cargando) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    if (mostrarRegistro) {
      return <Registro onVolverALogin={() => setMostrarRegistro(false)} />;
    }
    return <Login onIrARegistro={() => setMostrarRegistro(true)} />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/asistente" element={<AsistenteIA />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
