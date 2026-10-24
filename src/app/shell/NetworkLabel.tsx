// shell.md §1: the chain name is configuration (chain id 84532), not copy.
const NETWORK: string = import.meta.env.VITE_NETWORK_LABEL ?? 'Base Sepolia';

export function NetworkLabel() {
  return (
    <span className="network-label">
      <span className="network-dot" />
      {NETWORK}
    </span>
  );
}
