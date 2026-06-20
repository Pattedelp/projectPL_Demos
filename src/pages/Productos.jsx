import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputPrecio, formatearMiles } from "@/components/ui/input-precio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle, Pencil, FolderPlus } from "lucide-react";
import { Truck } from "lucide-react";
import { generarLinkWhatsApp, armarMensajeProveedor } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

const FORM_VACIO = {
  nombre: "",
  descripcion: "",
  precio: "",
  stock: "",
  stock_minimo: "5",
  categoria_id: "",
};

function Productos() {
  const { negocio } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState("");

  const [form, setForm] = useState(FORM_VACIO);
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");

  useEffect(() => {
    if (negocio) {
      obtenerTodo();
    }
  }, [negocio]);

  async function obtenerTodo() {
    const { data: dataProductos, error } = await supabase
      .from("productos")
      .select("*, categorias(nombre), producto_proveedores(proveedor_id)")
      .eq("negocio_id", negocio.id)
      .order("created_at", { ascending: false });

    const { data: dataCategorias } = await supabase
      .from("categorias")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    const { data: dataProveedores } = await supabase
      .from("proveedores")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    if (error) {
      console.error("Error trayendo productos:", error);
    } else {
      setProductos(dataProductos);
    }
    setCategorias(dataCategorias || []);
    setProveedores(dataProveedores || []);
    setCargando(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setProveedoresSeleccionados([]);
    setOpen(true);
  }

  function abrirEdicion(producto) {
    setEditandoId(producto.id);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      precio: formatearMiles(String(producto.precio)),
      stock: String(producto.stock),
      stock_minimo: String(producto.stock_minimo),
      categoria_id: producto.categoria_id || "",
    });
    setProveedoresSeleccionados(
      (producto.producto_proveedores || []).map((pp) => pp.proveedor_id),
    );
    setOpen(true);
  }

  function toggleProveedor(id) {
    setProveedoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function crearCategoria() {
    if (!nombreNuevaCategoria.trim()) return;

    const { data, error } = await supabase
      .from("categorias")
      .insert([{ nombre: nombreNuevaCategoria, negocio_id: negocio.id }])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Error al crear la categoría");
      return;
    }

    setCategorias(
      [...categorias, data].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    setForm({ ...form, categoria_id: data.id });
    setNombreNuevaCategoria("");
    setCreandoCategoria(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio.replace(/\./g, "").replace(",", ".")) || 0,
      stock: parseInt(form.stock) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      categoria_id: form.categoria_id || null,
      negocio_id: negocio.id,
    };

    let error, productoId;

    if (editandoId) {
      productoId = editandoId;
      ({ error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", editandoId));
    } else {
      const { data, error: errorInsert } = await supabase
        .from("productos")
        .insert([payload])
        .select()
        .single();
      error = errorInsert;
      productoId = data?.id;
    }

    if (error) {
      console.error("Error guardando producto:", error);
      alert("Hubo un error al guardar el producto");
      setGuardando(false);
      return;
    }

    await supabase
      .from("producto_proveedores")
      .delete()
      .eq("producto_id", productoId);

    if (proveedoresSeleccionados.length > 0) {
      await supabase.from("producto_proveedores").insert(
        proveedoresSeleccionados.map((proveedor_id) => ({
          producto_id: productoId,
          proveedor_id,
        })),
      );
    }

    setForm(FORM_VACIO);
    setEditandoId(null);
    setProveedoresSeleccionados([]);
    setOpen(false);
    obtenerTodo();
    setGuardando(false);
  }

  function obtenerResumenStockBajo() {
    const productosStockBajo = productos.filter(
      (p) => p.stock <= p.stock_minimo,
    );

    const porProveedor = {};

    productosStockBajo.forEach((p) => {
      const proveedorIds =
        p.producto_proveedores?.map((pp) => pp.proveedor_id) || [];
      if (proveedorIds.length === 0) return;

      const primerProveedorId = proveedorIds[0];
      if (!porProveedor[primerProveedorId])
        porProveedor[primerProveedorId] = [];
      porProveedor[primerProveedorId].push(p);
    });

    return porProveedor;
  }

  function contactarProveedor(proveedorId, productosDelProveedor) {
    const proveedor = proveedores.find((p) => p.id === proveedorId);
    if (!proveedor) return;
    const mensaje = armarMensajeProveedor(
      proveedor.nombre,
      productosDelProveedor,
    );
    window.open(generarLinkWhatsApp(proveedor.telefono, mensaje), "_blank");
  }

  // Agrupar productos por categoría
  const grupos = {};
  productos.forEach((p) => {
    const clave = p.categorias?.nombre || "Sin categoría";
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(p);
  });
  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()),
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Productos / Stock
          </h1>
          <p className="text-muted-foreground mt-1">Inventario del negocio.</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditandoId(null);
              setForm(FORM_VACIO);
              setCreandoCategoria(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={abrirNuevo}>
              <Plus size={18} className="mr-2" />
              Nuevo producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editandoId ? "Editar producto" : "Agregar nuevo producto"}
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
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="categoria">Categoría</Label>
                {!creandoCategoria ? (
                  <div className="flex gap-2 mt-1">
                    <select
                      id="categoria"
                      name="categoria_id"
                      value={form.categoria_id}
                      onChange={handleChange}
                      className="flex-1 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCreandoCategoria(true)}
                      className="shrink-0 flex items-center gap-1 text-sm text-primary hover:text-blue-300 px-3 border border-border rounded-lg transition-colors"
                      title="Crear nueva categoría"
                    >
                      <FolderPlus size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input
                      autoFocus
                      placeholder="Nombre de la categoría"
                      value={nombreNuevaCategoria}
                      onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          crearCategoria();
                        }
                      }}
                    />
                    <Button type="button" onClick={crearCategoria}>
                      Crear
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreandoCategoria(false);
                        setNombreNuevaCategoria("");
                      }}
                      className="text-muted-foreground hover:text-foreground text-sm px-2"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">
                  Proveedores
                  {proveedoresSeleccionados.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      ({proveedoresSeleccionados.length} seleccionado
                      {proveedoresSeleccionados.length > 1 ? "s" : ""})
                    </span>
                  )}
                </Label>
                {proveedores.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No tenés proveedores cargados todavía.
                  </p>
                ) : (
                  <>
                    {proveedores.length > 6 && (
                      <Input
                        placeholder="Buscar proveedor..."
                        value={busquedaProveedor}
                        onChange={(e) => setBusquedaProveedor(e.target.value)}
                        className="mb-2 h-8"
                      />
                    )}
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {proveedoresFiltrados.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Sin resultados.
                        </p>
                      ) : (
                        proveedoresFiltrados.map((prov) => {
                          const seleccionado =
                            proveedoresSeleccionados.includes(prov.id);
                          return (
                            <button
                              key={prov.id}
                              type="button"
                              onClick={() => toggleProveedor(prov.id)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                seleccionado
                                  ? "bg-primary/20 border-primary text-primary"
                                  : "border-border text-muted-foreground hover:border-muted-foreground"
                              }`}
                            >
                              <Truck size={12} />
                              {prov.nombre}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="precio">Precio</Label>
                  <InputPrecio
                    id="precio"
                    name="precio"
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
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Guardar producto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        {(() => {
          const resumen = obtenerResumenStockBajo();
          const proveedorIds = Object.keys(resumen);
          if (proveedorIds.length === 0) return null;

          return (
            <div className="bg-card border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={16} className="text-amber-500" />
                <h3 className="text-foreground font-medium text-sm">
                  Tenés stock bajo en {proveedorIds.length} proveedor(es)
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {proveedorIds.map((proveedorId) => {
                  const proveedor = proveedores.find(
                    (p) => p.id === proveedorId,
                  );
                  const cant = resumen[proveedorId].length;
                  return (
                    <button
                      key={proveedorId}
                      onClick={() =>
                        contactarProveedor(proveedorId, resumen[proveedorId])
                      }
                      className="flex items-center gap-1.5 text-xs bg-green-600/10 text-green-500 hover:bg-green-600/20 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <MessageCircle size={12} />
                      {proveedor?.nombre} ({cant})
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay productos cargados.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([nombreCategoria, items]) => (
            <div key={nombreCategoria}>
              <h2 className="text-muted-foreground font-semibold text-sm uppercase tracking-wide mb-3">
                {nombreCategoria}
                <span className="text-muted-foreground font-normal normal-case ml-2">
                  ({items.length})
                </span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((producto) => {
                  const stockBajo = producto.stock <= producto.stock_minimo;
                  return (
                    <div
                      key={producto.id}
                      className={`group relative bg-card border rounded-lg p-4 hover:bg-card/80 transition-all ${
                        stockBajo
                          ? "border-red-500/50"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <button
                        onClick={() => abrirEdicion(producto)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Editar producto"
                      >
                        <Pencil size={15} />
                      </button>

                      <h3 className="text-foreground font-semibold pr-6">
                        {producto.nombre}
                      </h3>
                      {stockBajo && (
                        <div className="inline-flex items-center gap-1 text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded-md mt-1 mb-2">
                          <AlertTriangle size={12} />
                          Stock bajo
                        </div>
                      )}
                      {producto.descripcion && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2 mt-1">
                          {producto.descripcion}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                        <span className="text-foreground font-semibold">
                          ${Number(producto.precio).toLocaleString("es-AR")}
                        </span>
                        <span
                          className={`text-sm ${stockBajo ? "text-red-400" : "text-muted-foreground"}`}
                        >
                          Stock: {producto.stock}
                        </span>
                      </div>

                      {stockBajo &&
                        producto.producto_proveedores?.length > 0 && (
                          <button
                            onClick={() => {
                              const proveedor = proveedores.find(
                                (p) =>
                                  p.id ===
                                  producto.producto_proveedores[0].proveedor_id,
                              );
                              if (!proveedor) return;
                              const mensaje = armarMensajeProveedor(
                                proveedor.nombre,
                                [producto],
                              );
                              window.open(
                                generarLinkWhatsApp(
                                  proveedor.telefono,
                                  mensaje,
                                ),
                                "_blank",
                              );
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs bg-green-600/10 text-green-500 hover:bg-green-600/20 px-2 py-1.5 rounded-md transition-colors"
                          >
                            <MessageCircle size={12} />
                            Pedir reposición
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Productos;
