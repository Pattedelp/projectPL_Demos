import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useSucursal } from "@/context/SucursalContext"

export function useAlertas() {
  const { negocio } = useAuth()
  const { sucursalActual } = useSucursal()
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (negocio && sucursalActual) {
      obtenerAlertas()
    }
  }, [negocio, sucursalActual])

  async function obtenerAlertas() {
    const { data } = await supabase
      .from("stock_sucursal")
      .select("stock, stock_minimo, productos(id, nombre)")
      .eq("sucursal_id", sucursalActual.id)

    const stockBajo = (data || []).filter((s) => s.stock <= s.stock_minimo)

    setAlertas(
      stockBajo.map((s) => ({
        id: s.productos?.id,
        texto: `${s.productos?.nombre} tiene stock bajo (${s.stock} unidades)`,
      }))
    )
    setCargando(false)
  }

  return { alertas, cargando, recargar: obtenerAlertas }
}