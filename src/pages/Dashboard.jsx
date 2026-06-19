import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Package, AlertTriangle, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function Dashboard() {
  const [cargando, setCargando] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    obtenerDatos();
  }, []);

  async function obtenerDatos() {
    const { count: cantClientes } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true });

    const { data: dataProductos } = await supabase
      .from("productos")
      .select("*");

    setTotalClientes(cantClientes || 0);
    setProductos(dataProductos || []);
    setCargando(false);
  }

  const totalProductos = productos.length;
  const stockBajo = productos.filter((p) => p.stock <= p.stock_minimo).length;
  const valorInventario = productos.reduce(
    (acc, p) => acc + p.precio * p.stock,
    0,
  );

  const datosGrafico = productos
    .slice(0, 6)
    .map((p) => ({ nombre: p.nombre, stock: p.stock }));

  const tarjetas = [
    {
      titulo: "Clientes",
      valor: totalClientes,
      icono: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      titulo: "Productos",
      valor: totalProductos,
      icono: Package,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      titulo: "Stock bajo",
      valor: stockBajo,
      icono: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      titulo: "Valor inventario",
      valor: `$${valorInventario.toLocaleString()}`,
      icono: DollarSign,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
  ];

  if (cargando) {
    return (
      <div className="p-6">
        <p className="text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-slate-400 mb-6">Resumen general del negocio.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tarjetas.map(({ titulo, valor, icono: Icono, color, bg }) => (
          <div
            key={titulo}
            className="bg-slate-800 border border-slate-700 rounded-lg p-5"
          >
            <div
              className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}
            >
              <Icono className={color} size={20} />
            </div>
            <p className="text-slate-400 text-sm">{titulo}</p>
            <p className="text-white text-2xl font-bold mt-1">{valor}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h2 className="text-white font-semibold mb-4">Stock por producto</h2>
        {datosGrafico.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No hay productos cargados todavía.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
