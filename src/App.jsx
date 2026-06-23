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
import Proveedores from "@/pages/Proveedores";
import { SucursalProvider } from "@/context/SucursalContext"
import Reportes from "@/pages/Reportes"
function AppRoutes() {
  const { user, cargando, esDueño } = useAuth();
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
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <Routes>
            <Route
              path="/"
              element={esDueño ? <Dashboard /> : <Navigate to="/clientes" />}
            />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route
  path="/reportes"
  element={esDueño ? <Reportes /> : <Navigate to="/clientes" />}
/>
            <Route
              path="/asistente"
              element={esDueño ? <AsistenteIA /> : <Navigate to="/clientes" />}
            />
            <Route
              path="/configuracion"
              element={
                esDueño ? <Configuracion /> : <Navigate to="/clientes" />
              }
            />
            <Route path="*" element={<Navigate to="/clientes" />} />
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
        <SucursalProvider>
          <AppRoutes />
        </SucursalProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
