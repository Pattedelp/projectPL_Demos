import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [negocio, setNegocio] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    inicializar();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          obtenerNegocio(session.user.id);
        } else {
          setUser(null);
          setNegocio(null);
        }
      },
    );

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
    const { data } = await supabase
      .from("negocios")
      .select("*")
      .eq("user_id", userId)
      .single();
    setNegocio(data);
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

  return (
    <AuthContext.Provider value={{ user, negocio, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
