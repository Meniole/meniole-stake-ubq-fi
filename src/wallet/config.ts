import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, type Chain } from "viem/chains";
import { isLocalNode, RPC_URL } from "../constants/config";
import { http, createConfig, type Transport } from "wagmi";
import { injected } from "wagmi/connectors";
import type { AppKitNetwork } from "@reown/appkit/networks";

const anvilChain = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  testnet: true,
} as const satisfies Chain;

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvilChain] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  const rpcUrl = isLocalNode && chain.id === 31337 ? RPC_URL : `${RPC_URL}/${chain.id}`;

  acc[chain.id as ChainId] = http(rpcUrl, {
    batch: true,
  });
  return acc;
}, {} as TransportsMap);

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";

export const isWalletConnectConfigured = projectId.length > 0;

if (!isWalletConnectConfigured && import.meta.env.DEV) {
  console.warn(
    "⚠️  VITE_WALLETCONNECT_PROJECT_ID not configured. WalletConnect features will be limited.\n" + "Get your project ID at: https://cloud.reown.com/"
  );
}

const metadata = {
  name: "Ubiquity Staking",
  description: "Staking frontend for the Ubiquity protocol",
  url: typeof window !== "undefined" ? window.location.origin : "https://stake.ubq.fi",
  icons: [
    typeof window !== "undefined" ? `${window.location.origin}/src/assets/ubiquity-dao-logo.svg` : "https://stake.ubq.fi/src/assets/ubiquity-dao-logo.svg",
  ],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [...supportedChains] as [AppKitNetwork, ...AppKitNetwork[]],
  projectId,
  ssr: false,
});

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  transports,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: supportedChains as [AppKitNetwork, ...AppKitNetwork[]],
  projectId,
  metadata,
  features: {
    analytics: false,
  },
  themeVariables: {
    "--w3m-accent": "#00BFFF",
    "--w3m-border-radius-master": "4px",
  },
});
