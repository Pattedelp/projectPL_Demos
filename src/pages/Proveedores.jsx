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
import { Plus, Trash2, Pencil, Truck, Phone } from "lucide-react";

const FORM_VACIO = { nombre: "", telefono: "" };

function Proveedores() {
  const { negocio } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);

  useEffect(() => {
    if (negocio) {
      obtenerProveedores();
    }
  }, [negocio]);

  async function obtenerProveedores() {
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    if (error) {
      console.error("Error trayendo proveedores:", error);
    } else {
      setProveedores(data);
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

  function abrirEdicion(prov) {
    setEditandoId(prov.id);
    setForm({ nombre: prov.nombre, telefono: prov.telefono });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);

    let error;
    if (editandoId) {
      ({ error } = await supabase
        .from("proveedores")
        .update(form)
        .eq("id", editandoId));
    } else {
      ({ error } = await supabase
        .from("proveedores")
        .insert([{ ...form, negocio_id: negocio.id }]));
    }

    if (error) {
      console.error("Error guardando proveedor:", error);
      alert("Hubo un error al guardar el proveedor");
    } else {
      setForm(FORM_VACIO);
      setEditandoId(null);
      setOpen(false);
      obtenerProveedores();
    }
    setGuardando(false);
  }

  async function borrarProveedor(id) {
    const confirmar = confirm("¿Borrar este proveedor?");
    if (!confirmar) return;

    const { error } = await supabase.from("proveedores").delete().eq("id", id);
    if (!error) {
      setProveedores(proveedores.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Contactos para reposición de stock.
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
              Nuevo proveedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar proveedor" : "Agregar nuevo proveedor"}
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
                <Label htmlFor="telefono">WhatsApp</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  placeholder="Ej: 5491122334455"
                  value={form.telefono}
                  onChange={handleChange}
                  required
                />
                <p className="text-muted-foreground text-xs mt-1">
                  Formato internacional, sin espacios ni símbolos.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Guardar proveedor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : proveedores.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay proveedores cargados.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {proveedores.map((prov) => (
            <div
              key={prov.id}
              className="group relative bg-card border border-border rounded-lg p-4 hover:border-muted-foreground transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Truck size={18} />
                </div>
                <h3 className="text-foreground font-semibold truncate">
                  {prov.nombre}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <Phone size={13} />
                {prov.telefono}
              </p>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => abrirEdicion(prov)}
                  className="text-muted-foreground hover:text-primary text-xs flex items-center gap-1 transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => borrarProveedor(prov.id)}
                  className="text-muted-foreground hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Proveedores;
