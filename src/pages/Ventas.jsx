import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { negocio } = useAuth();
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState("1");

  useEffect(() => {
    obtenerTodo();
  }, []);

  async function obtenerTodo() {
    setCargando(true);

    const { data: dataVentas } = await supabase
      .from("ventas")
      .select("*, clientes(nombre), venta_items(*, productos(nombre))")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false });

    const { data: dataClientes } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    const { data: dataProductos } = await supabase
      .from("productos")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    setVentas(dataVentas || []);
    setClientes(dataClientes || []);
    setProductos(dataProductos || []);
    setCargando(false);
  }

  function agregarItem() {
    if (!productoSeleccionado || !cantidad || Number(cantidad) <= 0) return;

    const producto = productos.find((p) => p.id === productoSeleccionado);
    if (!producto) return;

    const yaExiste = items.find((i) => i.producto_id === producto.id);
    if (yaExiste) {
      setItems(
        items.map((i) =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + Number(cantidad) }
            : i,
        ),
      );
    } else {
      setItems([
        ...items,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: producto.precio,
          cantidad: Number(cantidad),
        },
      ]);
    }

    setProductoSeleccionado("");
    setCantidad("1");
  }

  function quitarItem(producto_id) {
    setItems(items.filter((i) => i.producto_id !== producto_id));
  }

  const total = items.reduce(
    (acc, i) => acc + i.precio_unitario * i.cantidad,
    0,
  );

  function resetForm() {
    setClienteId("");
    setItems([]);
    setProductoSeleccionado("");
    setCantidad("1");
  }

  async function handleGuardarVenta() {
    if (!clienteId || items.length === 0) {
      alert("Elegí un cliente y al menos un producto");
      return;
    }

    setGuardando(true);

    const { data: ventaCreada, error: errorVenta } = await supabase
      .from("ventas")
      .insert([{ cliente_id: clienteId, total, negocio_id: negocio.id }])
      .select()
      .single();

    if (errorVenta) {
      console.error(errorVenta);
      alert("Error al crear la venta");
      setGuardando(false);
      return;
    }

    const itemsParaInsertar = items.map((i) => ({
      venta_id: ventaCreada.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    }));

    const { error: errorItems } = await supabase
      .from("venta_items")
      .insert(itemsParaInsertar);

    if (errorItems) {
      console.error(errorItems);
      alert("Error al guardar los productos de la venta");
      setGuardando(false);
      return;
    }

    for (const i of items) {
      const producto = productos.find((p) => p.id === i.producto_id);
      const nuevoStock = producto.stock - i.cantidad;
      await supabase
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", i.producto_id);
    }

    resetForm();
    setOpen(false);
    obtenerTodo();
    setGuardando(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ventas</h1>
          <p className="text-slate-400 mt-1">Historial y carga de ventas.</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus size={18} className="mr-2" />
              Nueva venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cargar nueva venta</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <select
                  id="cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 mt-1 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <Label>Agregar productos</Label>
                <div className="flex gap-2 mt-1">
                  <select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="w-20 bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <Button type="button" onClick={agregarItem}>
                    Agregar
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((i) => (
                    <div
                      key={i.producto_id}
                      className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {i.nombre}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {i.cantidad} x ${i.precio_unitario} = $
                          {(i.cantidad * i.precio_unitario).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => quitarItem(i.producto_id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <span className="text-slate-400">Total</span>
                <span className="text-white text-xl font-bold">
                  ${total.toLocaleString()}
                </span>
              </div>

              <Button
                className="w-full"
                onClick={handleGuardarVenta}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Confirmar venta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="text-slate-400">Todavía no hay ventas registradas.</p>
      ) : (
        <div className="space-y-3">
          {ventas.map((venta) => (
            <div
              key={venta.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-blue-400" />
                  <span className="text-white font-semibold">
                    {venta.clientes?.nombre || "Cliente eliminado"}
                  </span>
                </div>
                <span className="text-white font-bold">
                  ${Number(venta.total).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-2">
                {new Date(venta.created_at).toLocaleString("es-AR")}
              </p>
              <div className="flex flex-wrap gap-2">
                {venta.venta_items?.map((item) => (
                  <span
                    key={item.id}
                    className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md"
                  >
                    {item.cantidad}x {item.productos?.nombre}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Ventas;
