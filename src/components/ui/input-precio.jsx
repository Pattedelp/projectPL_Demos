import { Input } from "@/components/ui/input";

function formatearMiles(valor) {
  const soloNumeros = valor.replace(/\D/g, "");
  if (!soloNumeros) return "";
  return new Intl.NumberFormat("es-AR").format(Number(soloNumeros));
}

function InputPrecio({ value, onChange, name, id, required }) {
  function handleChange(e) {
    const formateado = formatearMiles(e.target.value);
    onChange({ target: { name, value: formateado } });
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
        $
      </span>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        className="pl-7"
        required={required}
        inputMode="numeric"
      />
    </div>
  );
}

export { InputPrecio, formatearMiles };
