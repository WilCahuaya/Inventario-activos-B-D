/** Overlay a pantalla completa mientras se sube la cola offline. */
export function SyncBlockingOverlay({
  open,
  pending = 0,
  message = null,
}: {
  open: boolean;
  pending?: number;
  message?: string | null;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="sync-blocking-title"
      aria-describedby="sync-blocking-desc"
    >
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-6 shadow-lg">
        <div className="mb-4 flex justify-center">
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-hidden
          />
        </div>
        <h2 id="sync-blocking-title" className="text-center text-base font-semibold text-foreground">
          Sincronizando
        </h2>
        <p id="sync-blocking-desc" className="mt-2 text-center text-sm text-muted-foreground">
          Espere por favor. Se están enviando los cambios guardados sin conexión
          {pending > 0 ? ` (${pending} pendiente${pending === 1 ? "" : "s"})` : ""}.
        </p>
        {message && (
          <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-800 dark:text-amber-200">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
