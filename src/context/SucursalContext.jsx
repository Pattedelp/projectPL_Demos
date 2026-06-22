import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"

const SucursalContext = createContext()

export function SucursalProvider({ children }) {
  const { negocio } = useAuth()
  const [sucursales, setSucursales] = useState([])
  const [sucursalActual, setSucursalActual] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (negocio) {
      obtenerSucursales()
    } else {
      setSucursales([])
      setSucursalActual(null)
      setCargando(false)
    }
  }, [negocio])

  async function obtenerSucursales() {
    const { data } = await supabase
      .from("sucursales")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("created_at")

    setSucursales(data || [])
    setSucursalActual(data?.[0] || null)
    setCargando(false)
  }

  return (
    <SucursalContext.Provider
      value={{
        sucursales,
        sucursalActual,
        setSucursalActual,
        cargando,
        recargarSucursales: obtenerSucursales,
      }}
    >
      {children}
    </SucursalContext.Provider>
  )
}

export function useSucursal() {
  return useContext(SucursalContext)
}