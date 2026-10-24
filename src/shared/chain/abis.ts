// The calls the donor screens make, as human-readable ABI fragments checked against the frozen ABIs of the backend
// (`backend/src/generated/frozen/abis`): only the functions a screen reads or sends, never the whole contract.
import { parseAbi } from 'viem';

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

export const campaignAbi = parseAbi([
  'function status() view returns (uint8)',
  'function usdc() view returns (address)',
  'struct Split { uint16 incentivesBps; uint16 seedlingsBps; uint16 verificationBps; uint16 reserveBps; uint16 feeBps; }',
  'struct Config { address creator; string metadataURI; bytes32 speciesCode; bytes8 regionGeohash; uint32 regionRadiusM; uint32 treeTarget; uint16 anchorBps; uint16 perPlanterCap; uint256 fundingTarget; uint64 fundingDeadline; uint64 claimDeadline; uint16 commitmentUnits; uint64 timeUnit; Split split; }',
  'function config() view returns (Config)',
  'function totalRaised() view returns (uint256)',
  'function contributions(address contributor) view returns (uint256)',
  'function refundClaimed(address contributor) view returns (bool)',
  'function refundPool() view returns (uint256)',
  'function contribute(uint256 amount) returns (uint256)',
  'function markRefunding()',
  'function claimRefund() returns (uint256)',
]);
