import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { type Chain } from "viem/chains";
import { injected } from "@wagmi/connectors";
import {
  mainnet, // 1
  optimism, // 10
  bsc, // 56
  gnosis, // 100
  polygon, // 137
  zkSync, // 324
  base, // 8453
  arbitrum, // 42161
  celo, // 42220
  avalanche, // 43114
  blast, // 81457
  zora, // 7777777
  anvil, // 31337 (local dev chain)
} from "wagmi/chains";
import App from "./App.tsx";
// import './ubiquity-styles.css'; // Import ubiquity styles - REMOVED, will link in index.html
// import './grid-styles.css'; // Import grid styles (once) - REMOVED, will link in index.html
import { grid } from "./the-grid";

// Configure wagmi
const supportedChains = [mainnet, optimism, bsc, gnosis, polygon, zkSync, base, arbitrum, celo, avalanche, blast, zora, anvil] as [Chain, ...Chain[]];

// Get base RPC URL from env or use default
import { RPC_URL } from "./constants/config";
const rpcBaseUrl = RPC_URL;

// Dynamically create transports for all supported chains
const transports = supportedChains.reduce((acc, chain) => {
  acc[chain.id] = http(`http://localhost:8545`, { batch: true });
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const config = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  transports: transports,
});

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
const gridElement = document.getElementById("grid"); // Get the grid container

if (!rootElement) {
  throw new Error("Could not find root element to mount React app");
}
if (!gridElement) {
  console.warn("Could not find grid element for background animation"); // Warn if grid element is missing
}

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);

// Initialize the grid animation, targeting the #grid div if it exists
if (gridElement) {
  // Call grid with the element and the callback
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
