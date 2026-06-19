import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";

const FORM_VACIO = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
};

function Clientes() {
  const { negocio } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [form, setForm] = useState(FORM_VACIO);

  useEffect(() => {
    if (negocio) {
      obtenerClientes();
    }
  }, [negocio]);

  async function obtenerClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error trayendo clientes:", error);
    } else {
      setClientes(data);
    }
    setCargando(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setOpen(true);
  }

  function abrirEdicion(cliente) {
    setEditandoId(cliente.id);
    setForm({
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);

    let error;
    if (editandoId) {
      ({ error } = await supabase
        .from("clientes")
        .update(form)
        .eq("id", editandoId));
    } else {
      ({ error } = await supabase
        .from("clientes")
        .insert([{ ...form, negocio_id: negocio.id }]));
    }

    if (error) {
      console.error("Error guardando cliente:", error);
      alert("Hubo un error al guardar el cliente");
    } else {
      setForm(FORM_VACIO);
      setEditandoId(null);
      setOpen(false);
      obtenerClientes();
    }
    setGuardando(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-slate-400 mt-1">
            Listado de clientes del negocio.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditandoId(null);
              setForm(FORM_VACIO);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={abrirNuevo}>
              <Plus size={18} className="mr-2" />
              Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar cliente" : "Agregar nuevo cliente"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                />
              </div>

              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Guardar cliente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : clientes.length === 0 ? (
        <p className="text-slate-400">Todavía no hay clientes cargados.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="group relative bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-all"
            >
              <button
                onClick={() => abrirEdicion(cliente)}
                className="absolute top-3 right-3 text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar cliente"
              >
                <Pencil size={15} />
              </button>

              <div className="flex items-center gap-3 mb-3 pr-6">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-semibold text-sm shrink-0">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-white font-semibold truncate">
                  {cliente.nombre}
                </h3>
              </div>
              <div className="space-y-1">
                {cliente.email && (
                  <p className="text-slate-400 text-sm truncate">
                    {cliente.email}
                  </p>
                )}
                {cliente.telefono && (
                  <p className="text-slate-400 text-sm">{cliente.telefono}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clientes;
