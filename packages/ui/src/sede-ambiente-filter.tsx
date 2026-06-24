import { Select } from "./components";

export interface SedeFilterOption {
  id: string;
  nombre: string;
}

export function SedeAmbienteFilterSelect({
  sedes,
  value,
  onChange,
  className,
  id = "sede-ambiente-filter",
}: {
  sedes: SedeFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      className={className ?? "h-8 min-w-[11rem] max-w-full text-sm"}
      options={[
        { value: "", label: "Todas las sucursales", kind: "predeterminado" },
        ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre, kind: "predeterminado" as const })),
      ]}
    />
  );
}
