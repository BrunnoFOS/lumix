export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncAlertasCache } = await import("./lib/sync/alertas");

    // Sync inicial apos 10s (esperar servidor estabilizar)
    setTimeout(() => {
      syncAlertasCache();
      // Repetir a cada 1 hora
      setInterval(syncAlertasCache, 60 * 60 * 1000);
    }, 10_000);
  }
}
