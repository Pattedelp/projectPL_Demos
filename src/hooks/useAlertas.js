import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useAlertas() {
  const { negocio } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (negocio) {
      obtenerAlertas();
    }
  }, [negocio]);

  async function obtenerAlertas() {
    const { data } = await supabase
      .from("productos")
      .select("id, nombre, stock, stock_minimo")
      .eq("negocio_id", negocio.id);

    const productosStockBajo = (data || []).filter(
      (p) => p.stock <= p.stock_minimo,
    );

    setAlertas(
      productosStockBajo.map((p) => ({
        id: p.id,
        texto: `${p.nombre} tiene stock bajo (${p.stock} unidades)`,
      })),
    );
    setCargando(false);
  }

  return { alertas, cargando, recargar: obtenerAlertas };
}
