import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { aplicarTema } from "@/lib/temas";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [negocio, setNegocio] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    inicializar();

  const { data: listener } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    if (session?.user) {
      setUser(session.user)
      // Pequeño delay solo en el evento SIGNED_IN para dar tiempo
      // a que las inserciones de registro terminen
      if (_event === "SIGNED_IN") {
        setTimeout(() => obtenerNegocio(session.user.id), 1000)
      } else {
        obtenerNegocio(session.user.id)
      }
    } else {
      setUser(null)
      setNegocio(null)
      setRol(null)
    }
  }
)

    return () => listener.subscription.unsubscribe();
  }, []);

  async function inicializar() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await obtenerNegocio(session.user.id);
    }
    setCargando(false);
  }

  async function obtenerNegocio(userId) {
    const { data: miembro } = await supabase
      .from("miembros_negocio")
      .select("rol, negocio_id, negocios(*)")
      .eq("user_id", userId)
      .single();

    if (miembro) {
      setNegocio(miembro.negocios);
      setRol(miembro.rol);
      if (miembro.negocios?.color_tema) {
        aplicarTema(miembro.negocios.color_tema);
      }
    }
    setCargando(false);
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

async function registrar(email, password, nombreNegocio) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return error

  const { data: negocioCreado, error: errorNegocio } = await supabase
    .from("negocios")
    .insert([{ nombre: nombreNegocio, user_id: data.user.id }])
    .select()
    .single()

  if (errorNegocio) return errorNegocio

  const { error: errorMiembro } = await supabase.rpc("crear_miembro_dueno", {
    p_negocio_id: negocioCreado.id,
    p_user_id: data.user.id,
  })

  if (errorMiembro) return errorMiembro

const { error: errorSucursal } = await supabase
  .from("sucursales")
  .insert([{ nombre: "Casa Central", negocio_id: negocioCreado.id }])

  return errorSucursal
}
  return (
    <AuthContext.Provider
      value={{
        user,
        negocio,
        rol,
        esDueño: rol === "dueño",
        esEncargado: rol === "encargado",
        esVendedor: rol === "vendedor",
        puedeVerReportes: rol === "dueño" || rol === "encargado",
        puedeVerConfig: rol === "dueño",
        cargando,
        login,
        logout,
        registrar,
        setNegocioLocal: setNegocio,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
