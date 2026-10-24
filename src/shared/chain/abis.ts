// The calls the donor screens make, as human-readable ABI fragments checked against the frozen ABIs of the backend
// (`backend/src/generated/frozen/abis`): only the functions a screen reads or sends, never the whole contract.
import { parseAbi } from 'viem';

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const CONFIG = [
  'struct Split { uint16 incentivesBps; uint16 seedlingsBps; uint16 verificationBps; uint16 reserveBps; uint16 feeBps; }',
  'struct Config { address creator; string metadataURI; bytes32 speciesCode; bytes8 regionGeohash; uint32 regionRadiusM; uint32 treeTarget; uint16 anchorBps; uint16 perPlanterCap; uint256 fundingTarget; uint64 fundingDeadline; uint64 claimDeadline; uint16 commitmentUnits; uint64 timeUnit; Split split; }',
] as const;

export const campaignAbi = parseAbi([
  'function status() view returns (uint8)',
  'function usdc() view returns (address)',
  'function roles() view returns (address)',
  'function treeRegistry() view returns (address)',
  ...CONFIG,
  'function config() view returns (Config)',
  'function totalRaised() view returns (uint256)',
  'function contributions(address contributor) view returns (uint256)',
  'function refundClaimed(address contributor) view returns (bool)',
  'function refundPool() view returns (uint256)',
  'function contribute(uint256 amount) returns (uint256)',
  'function markRefunding()',
  'function claimRefund() returns (uint256)',
]);

export const rolesAbi = parseAbi(['function carbonLedger() view returns (address)']);

export const carbonLedgerAbi = parseAbi([
  'function buy(uint256 batchId, uint256 amount) returns (uint256)',
  'function declineReservation(address campaign)',
  'function retire(uint256 batchId, uint256 amount, string beneficiary, string purpose) returns (uint256)',
  'event Purchased(uint256 indexed batchId, address indexed buyer, uint256 amount, uint256 usdcPaid)',
  'event Retired(uint256 indexed retirementId, uint256 indexed batchId, address indexed holder, uint256 amount, string beneficiary, string purpose)',
]);

export const factoryAbi = parseAbi([
  ...CONFIG,
  'function validateConfig(Config cfg) view',
  'function createCampaign(Config cfg) returns (address)',
  'event CampaignCreated(address indexed campaign, address indexed creator, Config config)',
]);

export const treeRegistryAbi = parseAbi(['function flag(uint256 treeId, bytes32 reasonHash)']);
