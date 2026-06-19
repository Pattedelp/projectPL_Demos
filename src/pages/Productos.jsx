import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
    obtenerProductos();
  }, []);

  async function obtenerProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
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
        <div className="grid gap-3">
          {productos.map((producto) => {
            const stockBajo = producto.stock <= producto.stock_minimo;
            return (
              <div
                key={producto.id}
                className={`bg-slate-800 border rounded-lg p-4 flex items-center justify-between ${
                  stockBajo ? "border-red-500/50" : "border-slate-700"
                }`}
              >
                <div>
                  <h3 className="text-white font-semibold">
                    {producto.nombre}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {producto.descripcion}
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    ${producto.precio} · Stock: {producto.stock}
                  </p>
                </div>
                {stockBajo && (
                  <div className="flex items-center gap-1 text-red-400 text-sm font-medium bg-red-500/10 px-3 py-1.5 rounded-lg">
                    <AlertTriangle size={16} />
                    Stock bajo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Productos;
