// A real tree for the D07 specs: a funded campaign the test donor contributed to, a slot claimed for a planter, and the tree
// planted through the VerificationGateway with an attestation signed by the deployment's attester (anvil's account 2, a public
// development key). `statusOf` reads the registry back, so the API a spec answers can say what the chain says.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { DONOR_KEY, OPERATOR_KEY, type Chain } from './chain';

const RPC = 'http://127.0.0.1:8545';
const USDC = 1_000_000n;
const ATTESTER_KEY: Hex = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const PLANTER: Address = '0x00000000000000000000000000000000000a11ce';
/** Two anchor slots (25% of 10 trees) come first, so the first open slot is 3. */
const FIRST_SLOT = 3n;
const SCORE = 9000;
const HOUR = 3600n;
const NONCE_BITS = 64;

export const FLAGGED = 2;

const claimAbi = parseAbi(['function claimSlotsFor(address planter, uint16 count)']);
const gatewayAbi = parseAbi([
  'struct Attestation { uint8 kind; address campaign; uint256 slotId; uint256 treeId; address planter; uint8 milestone; bytes32 evidenceHash; bytes8 geohash; uint16 score; uint256 nonce; uint64 expiry; }',
  'function submit(Attestation att, bytes signature) returns (uint256 treeId)',
]);
const registryAbi = parseAbi([
  'function treeOfSlot(address campaign, uint256 slotId) view returns (uint256)',
  'function statusOf(uint256 treeId) view returns (uint8)',
]);

const addresses = (): Record<string, Address> =>
  JSON.parse(
    readFileSync(resolve('..', 'contracts', 'deployments', '31337.json'), 'utf8'),
  ) as Record<string, Address>;

const types = {
  Attestation: [
    { name: 'kind', type: 'uint8' },
    { name: 'campaign', type: 'address' },
    { name: 'slotId', type: 'uint256' },
    { name: 'treeId', type: 'uint256' },
    { name: 'planter', type: 'address' },
    { name: 'milestone', type: 'uint8' },
    { name: 'evidenceHash', type: 'bytes32' },
    { name: 'geohash', type: 'bytes8' },
    { name: 'score', type: 'uint16' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint64' },
  ],
} as const;

export type PlantedTree = { campaign: Address; treeId: string; statusOf: () => Promise<number> };

/** An Active campaign the test donor and one other wallet funded, with one tree planted and alive. */
export const plantTree = async (chain: Chain): Promise<PlantedTree> => {
  const { verificationGateway, treeRegistry } = addresses();
  const client = createPublicClient({ chain: foundry, transport: http(RPC), pollingInterval: 250 });
  const operator = createWalletClient({
    account: privateKeyToAccount(OPERATOR_KEY),
    chain: foundry,
    transport: http(RPC),
  });
  const mined = async (hash: Hex): Promise<void> => {
    await client.waitForTransactionReceipt({ hash });
  };

  const campaign = await chain.createCampaign({ fundingTarget: 20n * USDC, treeTarget: 10 });

  await chain.contributeFrom(campaign, 10n * USDC, DONOR_KEY);
  await chain.contributeFrom(campaign, 10n * USDC);
  await mined(
    await operator.writeContract({
      address: campaign,
      abi: claimAbi,
      functionName: 'claimSlotsFor',
      args: [PLANTER, 1],
    }),
  );

  const message = {
    kind: 0,
    campaign,
    slotId: FIRST_SLOT,
    treeId: 0n,
    planter: PLANTER,
    milestone: 0,
    evidenceHash: stringToHex('e2e planting evidence', { size: 32 }),
    geohash: stringToHex('qqguwvt', { size: 8 }),
    score: SCORE,
    nonce: BigInt(Date.now()) * 2n ** BigInt(NONCE_BITS / 8),
    expiry: (await client.getBlock()).timestamp + HOUR,
  } as const;
  const signature = await privateKeyToAccount(ATTESTER_KEY).signTypedData({
    domain: {
      name: 'Treecord',
      version: '1',
      chainId: foundry.id,
      verifyingContract: verificationGateway as Address,
    },
    types,
    primaryType: 'Attestation',
    message,
  });

  await mined(
    await operator.writeContract({
      address: verificationGateway as Address,
      abi: gatewayAbi,
      functionName: 'submit',
      args: [message, signature],
    }),
  );

  const treeId = await client.readContract({
    address: treeRegistry as Address,
    abi: registryAbi,
    functionName: 'treeOfSlot',
    args: [campaign, FIRST_SLOT],
  });

  return {
    campaign,
    treeId: String(treeId),
    statusOf: () =>
      client.readContract({
        address: treeRegistry as Address,
        abi: registryAbi,
        functionName: 'statusOf',
        args: [treeId],
      }),
  };
};
