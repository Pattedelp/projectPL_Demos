export function generarLinkWhatsApp(telefono, mensaje) {
  const telefonoLimpio = telefono.replace(/\D/g, "");
  const mensajeCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`;
}

export function armarMensajeProveedor(nombreProveedor, productos) {
  const lista = productos
    .map((p) => `• ${p.nombre} (quedan ${p.stock} unidades)`)
    .join("\n");

  return `Hola ${nombreProveedor}! Te escribo porque necesito reponer stock de los siguientes productos:\n\n${lista}\n\n¿Me pasás precios y disponibilidad? Gracias!`;
}
