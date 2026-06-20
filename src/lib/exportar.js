import Papa from "papaparse";

export function exportarCSV(datos, nombreArchivo) {
  if (!datos || datos.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const csv = Papa.unparse(datos);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
