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
import { Plus, AlertTriangle } from "lucide-react";

function Productos() {
  const { negocio } = useAuth();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    stock_minimo: "5",
  });

  useEffect(() => {
    if (negocio) {
      obtenerProductos();
    }
  }, [negocio]);

  async function obtenerProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error trayendo productos:", error);
    } else {
      setProductos(data);
    }
    setCargando(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);

    const payload = {
      ...form,
      precio: parseFloat(form.precio) || 0,
      stock: parseInt(form.stock) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      negocio_id: negocio.id,
    };

    const { error } = await supabase.from("productos").insert([payload]);

    if (error) {
      console.error("Error guardando producto:", error);
      alert("Hubo un error al guardar el producto");
    } else {
      setForm({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
        stock_minimo: "5",
      });
      setOpen(false);
      obtenerProductos();
    }
    setGuardando(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos / Stock</h1>
          <p className="text-slate-400 mt-1">Inventario del negocio.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={18} className="mr-2" />
              Nuevo producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar nuevo producto</DialogTitle>
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
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    name="precio"
                    type="number"
                    step="0.01"
                    value={form.precio}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    value={form.stock}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock_minimo">Mínimo</Label>
                  <Input
                    id="stock_minimo"
                    name="stock_minimo"
                    type="number"
                    value={form.stock_minimo}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-slate-400">Todavía no hay productos cargados.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {productos.map((producto) => {
            const stockBajo = producto.stock <= producto.stock_minimo;
            return (
              <div
                key={producto.id}
                className={`bg-slate-800 border rounded-lg p-4 hover:bg-slate-800/80 transition-all ${
                  stockBajo
                    ? "border-red-500/50"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold">
                    {producto.nombre}
                  </h3>
                  {stockBajo && (
                    <div className="flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-md shrink-0">
                      <AlertTriangle size={12} />
                      Bajo
                    </div>
                  )}
                </div>
                {producto.descripcion && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                    {producto.descripcion}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                  <span className="text-white font-semibold">
                    ${producto.precio}
                  </span>
                  <span
                    className={`text-sm ${stockBajo ? "text-red-400" : "text-slate-400"}`}
                  >
                    Stock: {producto.stock}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Productos;
