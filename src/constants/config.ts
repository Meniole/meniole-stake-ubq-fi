/**
 * RPC endpoint for blockchain calls.
 * - In development (including deno.dev preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
const isDevelopment = !!import.meta.env.DEV || self.location.hostname.includes(".deno.dev");
export const RPC_URL = isDevelopment ? "https://rpc.ubq.fi" : `${self.location.origin}/rpc`;
