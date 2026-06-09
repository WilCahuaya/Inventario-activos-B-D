export function ConnectionBadge({
  online,
  pending = 0,
  syncing = false,
}: {
  online: boolean;
  pending?: number;
  syncing?: boolean;
}) {
  const label = syncing
    ? "Sincronizando…"
    : online
      ? pending > 0
        ? `En línea · ${pending} pendiente${pending === 1 ? "" : "s"}`
        : "En línea"
      : pending > 0
        ? `Sin conexión · ${pending} pendiente${pending === 1 ? "" : "s"}`
        : "Sin conexión";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? pending > 0
            ? "bg-sky-500/15 text-sky-800 dark:text-sky-300"
            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          syncing ? "animate-pulse bg-sky-500" : online ? "bg-emerald-500" : "bg-amber-500"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}
