import * as XLSX from "xlsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useSucursal } from "@/context/SucursalContext";
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
import {
  Plus,
  AlertTriangle,
  Pencil,
  FolderPlus,
  Truck,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
} from "lucide-react";
import { generarLinkWhatsApp, armarMensajeProveedor } from "@/lib/whatsapp";
import ObservadorScroll from "@/components/ObservadorScroll";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";

const FORM_VACIO = {
  nombre: "",
  descripcion: "",
  precio: "",
  stock: "",
  stock_minimo: "5",
  categoria_id: "",
  codigo_barras: "",
};

function Productos() {
  const { negocio } = useAuth();
  const { sucursalActual } = useSucursal();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState("");
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [cantidadVisible, setCantidadVisible] = useState({});
  const [form, setForm] = useState(FORM_VACIO);
  const [escaneandoCodigo, setEscaneandoCodigo] = useState(false);
  const html5QrProductoRef = useRef(null);
  const [importando, setImportando] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    if (negocio && sucursalActual) {
      obtenerTodo();
    }
  }, [negocio, sucursalActual]);

  async function obtenerTodo() {
    const { data: dataProductos, error } = await supabase
      .from("productos")
      .select(
        `*, categorias(nombre), producto_proveedores(proveedor_id), stock_sucursal!inner(stock, stock_minimo, sucursal_id)`,
      )
      .eq("negocio_id", negocio.id)
      .eq("stock_sucursal.sucursal_id", sucursalActual.id)
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
      const productosConStock = (dataProductos || []).map((p) => ({
        ...p,
        stock: p.stock_sucursal?.[0]?.stock ?? 0,
        stock_minimo: p.stock_sucursal?.[0]?.stock_minimo ?? 5,
      }));
      setProductos(productosConStock);
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
      codigo_barras: producto.codigo_barras || "",
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
      categoria_id: form.categoria_id || null,
      negocio_id: negocio.id,
      codigo_barras: form.codigo_barras || null,
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
    await supabase.from("stock_sucursal").upsert(
      {
        producto_id: productoId,
        sucursal_id: sucursalActual.id,
        stock: parseInt(form.stock) || 0,
        stock_minimo: parseInt(form.stock_minimo) || 5,
      },
      { onConflict: "producto_id,sucursal_id" },
    );

    setForm(FORM_VACIO);
    setEditandoId(null);
    setProveedoresSeleccionados([]);
    setOpen(false);
    obtenerTodo();
    setGuardando(false);
  }

  function toggleCategoria(nombreCategoria) {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [nombreCategoria]: !prev[nombreCategoria],
    }));
    if (!cantidadVisible[nombreCategoria]) {
      setCantidadVisible((prev) => ({ ...prev, [nombreCategoria]: 12 }));
    }
  }

  function cargarMas(nombreCategoria) {
    setCantidadVisible((prev) => ({
      ...prev,
      [nombreCategoria]: (prev[nombreCategoria] || 12) + 12,
    }));
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

  async function iniciarScannerProducto() {
    setEscaneandoCodigo(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const html5Qr = new Html5Qrcode("scanner-producto");
      html5QrProductoRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          setForm((prev) => ({ ...prev, codigo_barras: decodedText }));
          detenerScannerProducto();
        },
        () => {},
      );
    } catch {
      setEscaneandoCodigo(false);
    }
  }

  async function detenerScannerProducto() {
    if (html5QrProductoRef.current) {
      try {
        await html5QrProductoRef.current.stop();
        html5QrProductoRef.current.clear();
      } catch {}
      html5QrProductoRef.current = null;
    }
    setEscaneandoCodigo(false);
  }

  function descargarPlantillaProductos() {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "nombre",
        "descripcion",
        "precio",
        "stock",
        "stock_minimo",
        "categoria",
        "codigo_barras",
      ],
      [
        "Látex interior blanco 4L",
        "Pintura látex para interior",
        "8500",
        "10",
        "3",
        "Látex interior",
        "7891234567890",
      ],
      ["Esmalte sintético negro 1L", "", "4200", "5", "2", "Esmaltes", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos_workpilot.xlsx");
  }

  async function importarProductosExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(ws, { defval: "" });

        let exitosos = 0;
        let errores = 0;

        for (const fila of filas) {
          if (!fila.nombre || !fila.precio) {
            errores++;
            continue;
          }

          // Buscar o crear categoría
          let categoriaId = null;
          if (fila.categoria) {
            const { data: catExistente } = await supabase
              .from("categorias")
              .select("id")
              .eq("negocio_id", negocio.id)
              .ilike("nombre", fila.categoria.trim())
              .single();

            if (catExistente) {
              categoriaId = catExistente.id;
            } else {
              const { data: catNueva } = await supabase
                .from("categorias")
                .insert([
                  { nombre: fila.categoria.trim(), negocio_id: negocio.id },
                ])
                .select()
                .single();
              categoriaId = catNueva?.id;
            }
          }

          const { data: prod, error } = await supabase
            .from("productos")
            .insert([
              {
                nombre: fila.nombre.trim(),
                descripcion: fila.descripcion || null,
                precio: parseFloat(String(fila.precio).replace(",", ".")) || 0,
                categoria_id: categoriaId,
                negocio_id: negocio.id,
                codigo_barras: fila.codigo_barras
                  ? String(fila.codigo_barras).trim()
                  : null,
              },
            ])
            .select()
            .single();

          if (error || !prod) {
            errores++;
            continue;
          }

          // Crear stock en sucursal activa
          await supabase.from("stock_sucursal").upsert(
            {
              producto_id: prod.id,
              sucursal_id: sucursalActual.id,
              stock: parseInt(fila.stock) || 0,
              stock_minimo: parseInt(fila.stock_minimo) || 5,
            },
            { onConflict: "producto_id,sucursal_id" },
          );

          exitosos++;
        }

        alert(
          `Importación completa: ${exitosos} productos importados${errores > 0 ? `, ${errores} errores` : ""}.`,
        );
        obtenerTodo();
      } catch (err) {
        alert(
          "Error al leer el archivo. Verificá que sea un Excel válido con el formato de la plantilla.",
        );
      }
      setImportando(false);
      if (importRef.current) importRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  }

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()),
  );
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const grupos = {};
  productosFiltrados.forEach((p) => {
    const clave = p.categorias?.nombre || "Sin categoría";
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(p);
  });

  const resumenStockBajo = obtenerResumenStockBajo();
  const proveedorIdsConPendientes = Object.keys(resumenStockBajo);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Productos / Stock
          </h1>
          <p className="text-muted-foreground mt-1">Inventario del negocio.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarPlantillaProductos}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            Plantilla Excel
          </button>
          <label
            className={`flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-lg transition-colors cursor-pointer ${importando ? "text-muted-foreground/50" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Upload size={14} />
            {importando ? "Importando..." : "Importar Excel"}
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={importarProductosExcel}
              disabled={importando}
            />
          </label>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setEditandoId(null);
              setForm(FORM_VACIO);
              setCreandoCategoria(false);
              setProveedoresSeleccionados([]);
              detenerScannerProducto();
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
                <Label htmlFor="codigo_barras">
                  Código de barras (opcional)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="codigo_barras"
                    name="codigo_barras"
                    value={form.codigo_barras}
                    onChange={handleChange}
                    placeholder="EAN, UPC, o código interno"
                  />
                  {!escaneandoCodigo ? (
                    <button
                      type="button"
                      onClick={iniciarScannerProducto}
                      className="shrink-0 flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Camera size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={detenerScannerProducto}
                      className="shrink-0 flex items-center gap-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {escaneandoCodigo && (
                  <div
                    id="scanner-producto"
                    className="w-full mt-2 rounded-lg overflow-hidden"
                    style={{ minHeight: "200px" }}
                  />
                )}
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
                      className="flex-1 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
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
                      className="shrink-0 flex items-center gap-1 text-sm text-primary px-3 border border-border rounded-lg transition-colors"
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
                      {proveedoresFiltrados.map((prov) => {
                        const seleccionado = proveedoresSeleccionados.includes(
                          prov.id,
                        );
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => toggleProveedor(prov.id)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${seleccionado ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-muted-foreground"}`}
                          >
                            <Truck size={12} />
                            {prov.nombre}
                          </button>
                        );
                      })}
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
      </div>

      <Input
        placeholder="Buscar producto por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4 max-w-md"
      />

      {proveedorIdsConPendientes.length > 0 && (
        <div className="bg-card border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-amber-500" />
            <h3 className="text-foreground font-medium text-sm">
              Tenés stock bajo en {proveedorIdsConPendientes.length}{" "}
              proveedor(es)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {proveedorIdsConPendientes.map((proveedorId) => {
              const proveedor = proveedores.find((p) => p.id === proveedorId);
              const cant = resumenStockBajo[proveedorId].length;
              return (
                <button
                  key={proveedorId}
                  onClick={() =>
                    contactarProveedor(
                      proveedorId,
                      resumenStockBajo[proveedorId],
                    )
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
      )}

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay productos cargados.
        </p>
      ) : productosFiltrados.length === 0 ? (
        <p className="text-muted-foreground">
          No se encontraron productos con ese nombre.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grupos).map(([nombreCategoria, items]) => {
            const expandida = categoriasExpandidas[nombreCategoria];
            const visibles = cantidadVisible[nombreCategoria] || 12;
            const itemsVisibles = items.slice(0, visibles);
            const hayMas = visibles < items.length;
            return (
              <div
                key={nombreCategoria}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleCategoria(nombreCategoria)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-foreground font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    {expandida ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    {nombreCategoria}
                    <span className="text-muted-foreground font-normal normal-case">
                      ({items.length} producto{items.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground font-normal normal-case">
                    {expandida ? "Ocultar" : "Ver productos"}
                  </span>
                </button>
                {expandida && (
                  <div className="p-4 pt-0">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {itemsVisibles.map((producto) => {
                        const stockBajo =
                          producto.stock <= producto.stock_minimo;
                        return (
                          <div
                            key={producto.id}
                            className={`group relative bg-secondary border rounded-lg p-4 hover:bg-secondary/80 transition-all ${stockBajo ? "border-red-500/50" : "border-border hover:border-muted-foreground"}`}
                          >
                            <button
                              onClick={() => abrirEdicion(producto)}
                              className="absolute top-3 right-3 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
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
                                $
                                {Number(producto.precio).toLocaleString(
                                  "es-AR",
                                )}
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
                                        producto.producto_proveedores[0]
                                          .proveedor_id,
                                    );
                                    if (!proveedor) return;
                                    window.open(
                                      generarLinkWhatsApp(
                                        proveedor.telefono,
                                        armarMensajeProveedor(
                                          proveedor.nombre,
                                          [producto],
                                        ),
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
                    {hayMas && (
                      <ObservadorScroll
                        onVisible={() => cargarMas(nombreCategoria)}
                      />
                    )}
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
