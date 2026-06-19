import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerClientes();
  }, []);

  async function obtenerClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error trayendo clientes:", error);
    } else {
      setClientes(data);
    }
    setCargando(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Clientes</h1>
      <p className="text-slate-400 mt-2 mb-6">
        Listado de clientes del negocio.
      </p>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : (
        <div className="grid gap-3">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4"
            >
              <h3 className="text-white font-semibold">{cliente.nombre}</h3>
              <p className="text-slate-400 text-sm">{cliente.email}</p>
              <p className="text-slate-400 text-sm">{cliente.telefono}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clientes;
