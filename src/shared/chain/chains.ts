// The chains the app talks to (ADR-018): Base Sepolia in production, a local anvil (31337) for the browser specs. The RPC
// is public by design; `VITE_RPC_URL` overrides it. Nothing here is secret.
import { defineChain, type Chain } from 'viem';
import { baseSepolia, foundry } from 'viem/chains';

const ANVIL: Chain = defineChain({ ...foundry, id: 31_337, name: 'Anvil' });

const CHAINS: Readonly<Record<number, Chain>> = {
  [baseSepolia.id]: baseSepolia,
  [ANVIL.id]: ANVIL,
};

/** The chain with this id, or `null` for one the app does not know (the wallet could not be asked to switch to it). */
export const chainOf = (id: number): Chain | null => CHAINS[id] ?? null;

export const rpcOf = (chain: Chain): string => {
  const override: unknown = import.meta.env.VITE_RPC_URL;

  return typeof override === 'string' && override !== ''
    ? override
    : (chain.rpcUrls.default.http[0] ?? '');
};
