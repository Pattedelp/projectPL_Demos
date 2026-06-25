import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useSucursal } from "@/context/SucursalContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Scan, X, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

function Ventas() {
  const { negocio } = useAuth();
  const { sucursalActual } = useSucursal();
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [vistaVentas, setVistaVentas] = useState("lista");

  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState("1");

  // Código de barras
  const [escaneando, setEscaneando] = useState(false);
  const [codigoManual, setCodigoManual] = useState("");
  const [mensajeEscaneo, setMensajeEscaneo] = useState("");
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    if (negocio && sucursalActual) {
      obtenerTodo();
    }
  }, [negocio, sucursalActual]);

  // Limpiar scanner al cerrar
  useEffect(() => {
    if (!open && html5QrRef.current) {
      detenerScanner();
    }
  }, [open]);

  async function obtenerTodo() {
    setCargando(true);

    const { data: dataVentas } = await supabase
      .from("ventas")
      .select("*, clientes(nombre), venta_items(*, productos(nombre))")
      .eq("negocio_id", negocio.id)
      .eq("sucursal_id", sucursalActual.id)
      .order("created_at", { ascending: false });

    const { data: dataClientes } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("negocio_id", negocio.id)
      .order("nombre");

    const { data: dataProductos } = await supabase
      .from("productos")
      .select("*, stock_sucursal!inner(stock, stock_minimo, sucursal_id)")
      .eq("negocio_id", negocio.id)
      .eq("stock_sucursal.sucursal_id", sucursalActual.id)
      .order("nombre");

    setVentas(dataVentas || []);
    setClientes(dataClientes || []);

    const productosConStock = (dataProductos || []).map((p) => ({
      ...p,
      stock: p.stock_sucursal?.[0]?.stock ?? 0,
      stock_minimo: p.stock_sucursal?.[0]?.stock_minimo ?? 5,
    }));
    setProductos(productosConStock);
    setCargando(false);
  }

  // ── Código de barras ──────────────────────────────────────────────────────

  function agregarPorCodigo(codigo) {
    const producto = productos.find(
      (p) => p.codigo_barras && p.codigo_barras.trim() === codigo.trim(),
    );
    if (!producto) {
      setMensajeEscaneo(
        `❌ No se encontró ningún producto con el código ${codigo}`,
      );
      setTimeout(() => setMensajeEscaneo(""), 3000);
      return;
    }
    agregarItemDirecto(producto);
    setMensajeEscaneo(`✅ ${producto.nombre} agregado al carrito`);
    setTimeout(() => setMensajeEscaneo(""), 2000);
  }

  async function iniciarScanner() {
    setEscaneando(true);
    setMensajeEscaneo("");

    // Esperar a que el div esté montado
    await new Promise((r) => setTimeout(r, 300));

    try {
      const html5Qr = new Html5Qrcode("scanner-container");
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          agregarPorCodigo(decodedText);
          detenerScanner();
        },
        () => {}, // error silencioso mientras escanea
      );
    } catch (err) {
      setMensajeEscaneo(
        "❌ No se pudo acceder a la cámara. Usá el ingreso manual.",
      );
      setEscaneando(false);
    }
  }

  async function detenerScanner() {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
    }
    setEscaneando(false);
  }

  function handleCodigoManual(e) {
    e.preventDefault();
    if (!codigoManual.trim()) return;
    agregarPorCodigo(codigoManual.trim());
    setCodigoManual("");
  }

  // ── Carrito ───────────────────────────────────────────────────────────────

  function agregarItemDirecto(producto) {
    const yaExiste = items.find((i) => i.producto_id === producto.id);
    if (yaExiste) {
      setItems(
        items.map((i) =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
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
          cantidad: 1,
        },
      ]);
    }
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
    setCodigoManual("");
    setMensajeEscaneo("");
    detenerScanner();
  }

  async function handleGuardarVenta() {
    if (items.length === 0) {
      alert("Agregá al menos un producto");
      return;
    }
    setGuardando(true);

    const { data: ventaCreada, error: errorVenta } = await supabase
      .from("ventas")
      .insert([
        {
          cliente_id: clienteId || null,
          total,
          negocio_id: negocio.id,
          sucursal_id: sucursalActual.id,
        },
      ])
      .select()
      .single();

    if (errorVenta) {
      alert("Error al crear la venta");
      setGuardando(false);
      return;
    }

    const { error: errorItems } = await supabase.from("venta_items").insert(
      items.map((i) => ({
        venta_id: ventaCreada.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
    );

    if (errorItems) {
      alert("Error al guardar los productos de la venta");
      setGuardando(false);
      return;
    }

    for (const i of items) {
      const producto = productos.find((p) => p.id === i.producto_id);
      const nuevoStock = producto.stock - i.cantidad;
      await supabase
        .from("stock_sucursal")
        .update({ stock: nuevoStock })
        .eq("producto_id", i.producto_id)
        .eq("sucursal_id", sucursalActual.id);
    }

    resetForm();
    setOpen(false);
    obtenerTodo();
    setGuardando(false);
  }

  function agruparVentasPorDia() {
    const grupos = {};
    ventas.forEach((v) => {
      const fecha = new Date(v.created_at).toLocaleDateString("es-AR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!grupos[fecha]) grupos[fecha] = { ventas: [], total: 0 };
      grupos[fecha].ventas.push(v);
      grupos[fecha].total += Number(v.total);
    });
    return grupos;
  }

  const selectClass =
    "w-full min-w-0 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
          <p className="text-muted-foreground mt-1">
            Historial y carga de ventas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            <button
              onClick={() => setVistaVentas("lista")}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${vistaVentas === "lista" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Lista
            </button>
            <button
              onClick={() => setVistaVentas("agrupado")}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${vistaVentas === "agrupado" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Por día
            </button>
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              {" "}
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
                    className="w-full bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 mt-1 outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Consumidor final (sin registrar)</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de producto manual */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_4.5rem_5.5rem] gap-2">
                  <select
                    value={productoSeleccionado}
                    onChange={(e) => setProductoSeleccionado(e.target.value)}
                    className={selectClass}
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
                    className="w-full min-w-0 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button type="button" onClick={agregarItem}>
                    Agregar
                  </Button>
                </div>

                {/* Código de barras */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Scan size={14} className="text-muted-foreground" />
                      <span className="text-sm text-foreground font-medium">
                        Código de barras
                      </span>
                    </div>
                    {!escaneando ? (
                      <button
                        onClick={iniciarScanner}
                        className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Camera size={12} /> Usar cámara
                      </button>
                    ) : (
                      <button
                        onClick={detenerScanner}
                        className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <X size={12} /> Detener
                      </button>
                    )}
                  </div>

                  {/* Área de cámara */}
                  {escaneando && (
                    <div
                      id="scanner-container"
                      ref={scannerRef}
                      className="w-full rounded-lg overflow-hidden"
                      style={{ minHeight: "200px" }}
                    />
                  )}

                  {/* Ingreso manual de código */}
                  <form onSubmit={handleCodigoManual} className="flex gap-2">
                    <input
                      type="text"
                      value={codigoManual}
                      onChange={(e) => setCodigoManual(e.target.value)}
                      placeholder="O ingresá el código manualmente..."
                      className="flex-1 bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Buscar
                    </Button>
                  </form>

                  {mensajeEscaneo && (
                    <p
                      className={`text-xs px-2 py-1.5 rounded-lg ${mensajeEscaneo.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                    >
                      {mensajeEscaneo}
                    </p>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((i) => (
                      <div
                        key={i.producto_id}
                        className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            {i.nombre}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {i.cantidad} x ${i.precio_unitario} = $
                            {(i.cantidad * i.precio_unitario).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => quitarItem(i.producto_id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-foreground text-xl font-bold">
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
      </div>

      {cargando ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : ventas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay ventas registradas.
        </p>
      ) : vistaVentas === "agrupado" ? (
        <div className="space-y-6">
          {Object.entries(agruparVentasPorDia()).map(([fecha, grupo]) => (
            <div key={fecha}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold text-sm capitalize">
                  {fecha}
                </h3>
                <span className="text-muted-foreground text-sm">
                  Total:{" "}
                  <span className="text-foreground font-semibold">
                    ${grupo.total.toLocaleString("es-AR")}
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                {grupo.ventas.map((venta) => (
                  <div
                    key={venta.id}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={16} className="text-primary" />
                        <span className="text-foreground font-semibold">
                          {venta.clientes?.nombre || "Consumidor final"}
                        </span>
                      </div>
                      <span className="text-foreground font-bold">
                        ${Number(venta.total).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs mb-2">
                      {new Date(venta.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {venta.venta_items?.map((item) => (
                        <span
                          key={item.id}
                          className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-md"
                        >
                          {item.cantidad}x {item.productos?.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map((venta) => (
            <div
              key={venta.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-primary" />
                  <span className="text-foreground font-semibold">
                    {venta.clientes?.nombre || "Consumidor final"}
                  </span>
                </div>
                <span className="text-foreground font-bold">
                  ${Number(venta.total).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mb-2">
                {new Date(venta.created_at).toLocaleString("es-AR")}
              </p>
              <div className="flex flex-wrap gap-2">
                {venta.venta_items?.map((item) => (
                  <span
                    key={item.id}
                    className="text-xs bg-slate-700/50 text-muted-foreground px-2 py-1 rounded-md"
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
