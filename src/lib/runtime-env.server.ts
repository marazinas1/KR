/**
 * Server-only environment access.
 *
 * On Cloudflare Workers the environment is injected per request, so reading
 * `process.env` at module scope yields `undefined`. Every read here happens at
 * call time, resolving in order: stashed Worker `env` -> `process.env`.
 */

let workerEnv: Record<string, unknown> | undefined;

/** Called once per request from `src/server.ts` with the Worker `env` binding. */
export function setWorkerEnv(env: unknown) {
  if (env && typeof env === "object") {
    workerEnv = env as Record<string, unknown>;
  }
}

export function readEnvOptional(name: string): string | undefined {
  const fromWorker = workerEnv?.[name];
  if (typeof fromWorker === "string" && fromWorker.length > 0) return fromWorker;
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
  return undefined;
}

export function readEnv(name: string): string {
  const fromWorker = workerEnv?.[name];
  if (typeof fromWorker === "string" && fromWorker.length > 0) return fromWorker;

  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;

  throw new Error(`missing_env:${name}`);
}

/**
 * PROD credentials only on the published deployment; preview, dev hosts and
 * localhost always use DEV so test flows never create real bookings.
 */
export function isProductionRequest(host: string | null | undefined): boolean {
  if (!import.meta.env.PROD) return false;
  const hostname = (host ?? "").toLowerCase();
  if (!hostname) return false;
  if (hostname.includes("localhost") || hostname.startsWith("127.")) return false;
  if (hostname.includes("-dev.lovable.app")) return false;
  if (hostname.includes("id-preview")) return false;
  if (hostname.includes("lovableproject.com")) return false;
  return true;
}
