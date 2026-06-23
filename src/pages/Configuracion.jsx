import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { TEMAS, aplicarTema } from "@/lib/temas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Settings, Store } from "lucide-react";
import { PLANES } from "@/lib/planes";
import { CreditCard, Sparkles } from "lucide-react";
import { Tag, Trash2, Pencil, X } from "lucide-react";
import { exportarCSV } from "@/lib/exportar";
import { Download } from "lucide-react";
import { UserPlus } from "lucide-react";
import { useSucursal } from "@/context/SucursalContext"
import { Building2 } from "lucide-react"

function Configuracion() {
  const { negocio, setNegocioLocal } = useAuth();
  const [guardandoColor, setGuardandoColor] = useState(false);
  const [temaActual, setTemaActual] = useState(
    negocio?.color_tema || "naranja",
  );
  const [categorias, setCategorias] = useState([]);
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [miembros, setMiembros] = useState([]);
  const [emailInvitar, setEmailInvitar] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [mensajeInvitacion, setMensajeInvitacion] = useState(null);

  const [datosForm, setDatosForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    horario: "",
  });
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
const { sucursales, recargarSucursales } = useSucursal()
const [nombreSucursal, setNombreSucursal] = useState("")
const [direccionSucursal, setDireccionSucursal] = useState("")
const [agregandoSucursal, setAgregandoSucursal] = useState(false)
const [rolInvitar, setRolInvitar] = useState("vendedor")
  useEffect(() => {
    if (negocio) {
      setDatosForm({
        nombre: negocio.nombre || "",
        telefono: negocio.telefono || "",
        direccion: negocio.direccion || "",
        horario: negocio.horario || "",
      });
      obtenerCategorias();
      obtenerMiembros();
    }
  }, [negocio]);

  async function obtenerMiembros() {
    const { data } = await supabase
      .from("miembros_negocio")
      .select("id, rol, user_id")
      .eq("negocio_id", negocio.id);
    setMiembros(data || []);
  }

  async function invitarEmpleado(e) {
    e.preventDefault();
    setInvitando(true);
    setMensajeInvitacion(null);

const { data, error } = await supabase.functions.invoke("invitar-empleado", {
    body: { email: emailInvitar, negocioId: negocio.id, rol: rolInvitar },
  })

    if (error) {
      setMensajeInvitacion({
        tipo: "error",
        texto: "Error al enviar la invitación",
      });
    } else if (data.error) {
      setMensajeInvitacion({ tipo: "error", texto: data.error });
    } else {
      setMensajeInvitacion({
        tipo: "exito",
        texto: "Invitación enviada correctamente",
      });
      setEmailInvitar("");
      obtenerMiembros();
    }
    setInvitando(false);
  }

  async function obtenerCategorias() {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");
    setCategorias(data || []);
  }

  function iniciarEdicion(categoria) {
    setEditandoCategoriaId(categoria.id);
    setNombreEdicion(categoria.nombre);
  }

  async function guardarEdicionCategoria(id) {
    if (!nombreEdicion.trim()) return;

    const { error } = await supabase
      .from("categorias")
      .update({ nombre: nombreEdicion })
      .eq("id", id);

    if (error) {
      alert("Error al renombrar la categoría");
    } else {
      setCategorias(
        categorias.map((c) =>
          c.id === id ? { ...c, nombre: nombreEdicion } : c,
        ),
      );
    }
    setEditandoCategoriaId(null);
  }

  async function borrarCategoria(id) {
    const confirmar = confirm(
      "¿Borrar esta categoría? Los productos que la usen quedarán sin categoría.",
    );
    if (!confirmar) return;

    const { error } = await supabase.from("categorias").delete().eq("id", id);

    if (error) {
      alert("Error al borrar la categoría");
    } else {
      setCategorias(categorias.filter((c) => c.id !== id));
    }
  }

  function handleChangeDatos(e) {
    setDatosForm({ ...datosForm, [e.target.name]: e.target.value });
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setGuardandoDatos(true);
    setMensajeExito(false);

    const { error } = await supabase
      .from("negocios")
      .update(datosForm)
      .eq("id", negocio.id);

    if (error) {
      console.error("Error guardando datos:", error);
      alert("Hubo un error al guardar los datos");
    } else {
      setNegocioLocal({ ...negocio, ...datosForm });
      setMensajeExito(true);
      setTimeout(() => setMensajeExito(false), 3000);
    }
    setGuardandoDatos(false);
  }

  async function elegirTema(clave) {
    setTemaActual(clave);
    aplicarTema(clave);
    setGuardandoColor(true);

    const { error } = await supabase
      .from("negocios")
      .update({ color_tema: clave })
      .eq("id", negocio.id);

    if (error) {
      console.error("Error guardando tema:", error);
    } else {
      setNegocioLocal({ ...negocio, color_tema: clave });
    }
    setGuardandoColor(false);
  }

  async function exportarClientes() {
    const { data } = await supabase
      .from("clientes")
      .select("nombre, telefono, email, direccion")
      .eq("negocio_id", negocio.id);
    exportarCSV(data, "clientes");
  }

  async function exportarProductos() {
    const { data } = await supabase
      .from("productos")
      .select("nombre, descripcion, precio, stock, stock_minimo")
      .eq("negocio_id", negocio.id);
    exportarCSV(data, "productos");
  }

  async function exportarVentas() {
    const { data } = await supabase
      .from("ventas")
      .select("total, created_at, clientes(nombre)")
      .eq("negocio_id", negocio.id);

    const datosFormateados = data.map((v) => ({
      fecha: new Date(v.created_at).toLocaleDateString("es-AR"),
      cliente: v.clientes?.nombre || "Sin cliente",
      total: v.total,
    }));

    exportarCSV(datosFormateados, "ventas");
  }

  async function agregarSucursal(e) {
  e.preventDefault()
  if (!nombreSucursal.trim()) return
  setAgregandoSucursal(true)

  const { error } = await supabase
    .from("sucursales")
    .insert([{
      nombre: nombreSucursal,
      direccion: direccionSucursal,
      negocio_id: negocio.id,
    }])

  if (error) {
    alert("Error al agregar la sucursal")
  } else {
    setNombreSucursal("")
    setDireccionSucursal("")
    recargarSucursales()
  }
  setAgregandoSucursal(false)
}

async function borrarSucursal(id) {
  if (sucursales.length <= 1) {
    alert("El negocio debe tener al menos una sucursal")
    return
  }
  const confirmar = confirm("¿Borrar esta sucursal? Se perderán sus ventas y stock asociados.")
  if (!confirmar) return

  const { error } = await supabase.from("sucursales").delete().eq("id", id)
  if (!error) recargarSucursales()
}
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="text-primary" size={22} />
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
      </div>
      <p className="text-muted-foreground mb-8">Personalizá tu CRM.</p>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <Store size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">Datos del negocio</h2>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">Sucursales</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Gestioná las sucursales de tu negocio. El selector aparece automáticamente en la barra superior cuando tenés más de una.
          </p>

          {sucursales.length > 0 && (
            <div className="space-y-2 mb-4">
              {sucursales.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-foreground text-sm font-medium">{s.nombre}</p>
                    {s.direccion && (
                      <p className="text-muted-foreground text-xs">{s.direccion}</p>
                    )}
                  </div>
                  {sucursales.length > 1 && (
                    <button
                      onClick={() => borrarSucursal(s.id)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={agregarSucursal} className="flex gap-2">
            <Input
              placeholder="Nombre (ej: Sucursal Centro)"
              value={nombreSucursal}
              onChange={(e) => setNombreSucursal(e.target.value)}
              required
            />
            <Input
              placeholder="Dirección (opcional)"
              value={direccionSucursal}
              onChange={(e) => setDireccionSucursal(e.target.value)}
            />
            <Button type="submit" disabled={agregandoSucursal}>
              Agregar
            </Button>
          </form>
        </div>
          <p className="text-muted-foreground text-sm mb-5">
            Esta información puede aparecer en reportes o comprobantes.
          </p>

          <form onSubmit={guardarDatos} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del negocio</Label>
              <Input
                id="nombre"
                name="nombre"
                value={datosForm.nombre}
                onChange={handleChangeDatos}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={datosForm.telefono}
                  onChange={handleChangeDatos}
                />
              </div>
              <div>
                <Label htmlFor="horario">Horario de atención</Label>
                <Input
                  id="horario"
                  name="horario"
                  placeholder="Ej: Lun a Vie 9 a 18hs"
                  value={datosForm.horario}
                  onChange={handleChangeDatos}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                name="direccion"
                value={datosForm.direccion}
                onChange={handleChangeDatos}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={guardandoDatos}>
                {guardandoDatos ? "Guardando..." : "Guardar datos"}
              </Button>
              {mensajeExito && (
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <Check size={14} /> Guardado
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-foreground font-semibold mb-1">
            Colorimetría de la aplicación
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            Elegí el color principal que se usa en botones, links y elementos
            destacados.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TEMAS).map(([clave, tema]) => (
              <button
                key={clave}
                onClick={() => elegirTema(clave)}
                disabled={guardandoColor}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  temaActual === clave
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                {temaActual === clave && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check size={10} className="text-primary-foreground" />
                  </div>
                )}
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: tema.colorMuestra }}
                ></div>
                <span className="text-foreground text-sm font-medium">
                  {tema.nombre}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">
              Plan y facturación
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Tu plan actual:{" "}
            <span className="text-primary font-medium capitalize">
              {negocio?.plan || "básico"}
            </span>
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {Object.entries(PLANES).map(([clave, plan]) => {
              const esActual = negocio?.plan === clave;
              return (
                <div
                  key={clave}
                  className={`rounded-lg border p-4 ${
                    esActual ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-foreground font-semibold">
                      {plan.nombre}
                    </h3>
                    {clave === "premium" && (
                      <Sparkles size={14} className="text-primary" />
                    )}
                  </div>
                  <p className="text-foreground text-xl font-bold mb-3">
                    ${plan.precio}
                    <span className="text-muted-foreground text-sm font-normal">
                      /mes
                    </span>
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="text-muted-foreground text-xs flex items-start gap-1.5"
                      >
                        <Check
                          size={12}
                          className="text-primary mt-0.5 shrink-0"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {esActual ? (
                    <div className="text-center text-xs text-primary font-medium py-2">
                      Plan actual
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() =>
                        alert(
                          "Para cambiar de plan, contactá a tu proveedor. Próximamente esto será automático.",
                        )
                      }
                    >
                      Cambiar a {plan.nombre}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <Tag size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">
              Categorías de productos
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Renombrá o eliminá categorías existentes. Para crear una nueva,
            hacelo desde el formulario de un producto.
          </p>

          {categorias.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Todavía no creaste categorías.
            </p>
          ) : (
            <div className="space-y-2">
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                >
                  {editandoCategoriaId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={nombreEdicion}
                        onChange={(e) => setNombreEdicion(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            guardarEdicionCategoria(cat.id);
                        }}
                      />
                      <button
                        onClick={() => guardarEdicionCategoria(cat.id)}
                        className="text-primary hover:text-primary/80"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditandoCategoriaId(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-foreground text-sm">
                        {cat.nombre}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => iniciarEdicion(cat)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => borrarCategoria(cat.id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <Download size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">Exportar datos</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Descargá tu información en formato CSV, compatible con Excel.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportarClientes}>
              <Download size={14} className="mr-2" />
              Clientes
            </Button>
            <Button variant="outline" onClick={exportarProductos}>
              <Download size={14} className="mr-2" />
              Productos
            </Button>
            <Button variant="outline" onClick={exportarVentas}>
              <Download size={14} className="mr-2" />
              Ventas
            </Button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={18} className="text-foreground" />
            <h2 className="text-foreground font-semibold">
              Usuarios del negocio
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            {miembros.length} de {PLANES[negocio?.plan]?.precio ? "" : ""}
            usuario(s) según tu plan {negocio?.plan || "básico"}.
          </p>

          <div className="space-y-2 mb-5">
            {miembros.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
              >
                <span className="text-foreground text-sm">
                  {m.user_id === negocio?.user_id ? "Vos (dueño)" : "Empleado"}
                </span>
                <span className="text-muted-foreground text-xs capitalize">
                  {m.rol}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={invitarEmpleado} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@empleado.com"
                value={emailInvitar}
                onChange={(e) => setEmailInvitar(e.target.value)}
                required
              />
              <select
                value={rolInvitar}
                onChange={(e) => setRolInvitar(e.target.value)}
                className="bg-card border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary shrink-0"
              >
                <option value="vendedor">Vendedor</option>
                <option value="encargado">Encargado</option>
                <option value="empleado">Empleado</option>
              </select>
              <Button type="submit" disabled={invitando}>
                {invitando ? "Enviando..." : "Invitar"}
              </Button>
            </div>
          </form>

          {mensajeInvitacion && (
            <p
              className={`text-sm mt-2 ${
                mensajeInvitacion.tipo === "error"
                  ? "text-red-400"
                  : "text-green-500"
              }`}
            >
              {mensajeInvitacion.texto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Configuracion;
