# Ubiquity Stake (`stake.ubq.fi`)

Staking frontend for the Ubiquity protocol. Built with React, Vite, wagmi, viem, and TanStack Query. Provides a minimal and fast interface to stake LP tokens, manage allowances, view pool stats, and claim rewards.

## 🚀 Quick Start

Prerequisites: Bun (<https://bun.sh>) and an injected wallet extension.

```bash
git clone https://github.com/ubiquity/stake.ubq.fi.git
cd stake.ubq.fi
bun install

# Start against public mainnet RPC (default dev mode)
bun run dev

# OR start with a local Anvil + mainnet fork / local contracts
bun run local
```

Visit: <http://localhost:5173>

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `bun run dev` | Dev server (MODE=dev) using remote RPC |
| `bun run local` | Dev server (MODE=local-node) enabling `anvil` chain id 31337 |
| `bun run build` | Production build to `dist/` |
| `bun run lint` | ESLint over the repo |

## 🌐 RPC Resolution

Defined in `src/constants/config.ts`:

1. If `VITE_RPC_URL` env var is set → use it directly.
2. Else if development build or hostname includes `.deno.dev` (preview) → `https://rpc.ubq.fi`.
3. Else in production build → relative `/rpc` (can be reverse‑proxied / cached).

`local-node` mode adds the Anvil chain (31337) and uses the raw `RPC_URL` (no chain ID suffix) for all chains.

## 📦 Production Build & Deploy

```bash
bun run build
```

Outputs to `dist/`. Serve behind a CDN / static host. If you proxy RPC, map `/rpc/*` to your upstream provider for chain ID–scoped calls (`/${chainId}` suffix) except in `local-node` mode.
