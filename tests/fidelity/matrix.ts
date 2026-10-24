// docs/FE/fidelity.md §1, one entry per row. The row's `states` cell is kept as the document writes it
// (" · " between states); `statesOf` splits it. `stateCount` is the number the document states for the row.
export type MatrixRow = {
  /** `Shell` or `S02`…`S29` */
  id: string;
  screen: string;
  mockup: string;
  /** The app route; the Shell row names the shell routes it covers. */
  route: string;
  /** The fixture builder (tests/fidelity/fixtures/) and where the document defines its values. */
  fixture: string;
  /** The screen document under docs/FE/features/, without `.md`. */
  doc: string;
  stateCount: number;
  states: string;
};

/** NFR-034: every row is checked at a phone width and a wide desktop width. */
export const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 1920, height: 1080 },
] as const;

export const MATRIX: readonly MatrixRow[] = [
  {
    id: 'Shell',
    screen: 'Shell',
    mockup: 'shell.jsx, main.jsx, workspace.jsx',
    route: 'every route; /, /app, unknown',
    fixture: 'meProfiles() (accounts.md §1: Sari, Alex, Raka, Dewi, first sign-in)',
    doc: 'shell',
    stateCount: 23,
    states:
      'SH-1 Signed out · SH-2 Session resolving · SH-3 Signed in · SH-4 Display name null · SH-5 Wallet null · SH-6 `/app` redirecting · SH-7 Ready · SH-8 Error · SH-9 Offline · SH-10 Offline, nothing cached · SH-11 Forbidden · SH-12 Forbidden, two roles · SH-13 Not found (resource) · SH-14 Unknown route · SH-15 Session expired · SH-16 Wallet already linked · SH-17 Signing out · SH-18 Toast shown · SH-19 Motion playing · SH-20 Motion paused · SH-21 Reduced motion · SH-22 Tab hidden / art off screen · SH-23 Focus view (S19)',
  },
  {
    id: 'S02',
    screen: 'Sign in',
    mockup: 'shared-pages.jsx',
    route: '/sign-in?returnTo=',
    fixture: 'privySignIn() + meProfiles()',
    doc: 's02-sign-in',
    stateCount: 20,
    states:
      'SI-0 Loading · SI-1 Email step · SI-2 Email empty or malformed · SI-3 Sending code · SI-4 Send failed, provider unreachable · SI-5 Send refused · SI-6 Code step · SI-7 Code incomplete · SI-8 Verifying · SI-9 Wallet already linked · SI-10 Wrong code · SI-11 Expired code · SI-12 Provider unavailable · SI-13 Wallet not ready · SI-14 Profile read failed · SI-15 Session not accepted · SI-16 Ready · SI-17 Ready, no display name · SI-18 Already signed in · SI-19 Offline',
  },
  {
    id: 'S03',
    screen: 'Campaigns',
    mockup: 'main.jsx',
    route: '/campaigns',
    fixture: 'campaignList() (campaigns.md §1)',
    doc: 's03-campaigns',
    stateCount: 18,
    states:
      'C-1 Loading · C-2 Ready · C-3 Funding card · C-4 Deadline passed card · C-5 Active / Completed / Refunding card · C-6 Untitled card · C-7 Filters active · C-8 Empty · C-9 Filtered empty · C-10 Error · C-11 More available · C-12 Loading more · C-13 Load-more failed · C-14 All loaded · C-15 Offline with cache · C-16 Refreshed · C-17 Offline, nothing cached · C-18 Phone width',
  },
  {
    id: 'S04',
    screen: 'Campaign (D04, Start refund, D05, D06)',
    mockup: 'main.jsx, campaign-actions.jsx',
    route: '/campaigns/:address',
    fixture: 'campaignDetail() (campaigns.md §2) + chainState() (Anvil)',
    doc: 's04-campaign',
    stateCount: 61,
    states:
      'P-1 Loading · P-2 Not found · P-3 Load failed · P-4 Offline · P-5 Funding · P-6 Funding, deadline passed · P-7 Active · P-8 Refunding · P-9 Completed · P-10 Untitled · P-11 Address copied · P-12 Copy blocked · P-13 Phone width · D4-1 Field · D4-2 Disabled · D4-3 Reading · D4-4 Review, approval needed · D4-5 Approving · D4-6 Review, ready · D4-7 Remaining changed · D4-8 No longer open · D4-9 Awaiting wallet · D4-10 Sent · D4-11 Confirmed · D4-12 Wallet rejected · D4-13 Reverted · D4-14 Not enough USDC · D4-15 Not enough gas · D4-16 Wrong network · D4-17 Funded by this contribution · SR-1 Offered · SR-2 Review · SR-3 Not eligible on re-read · SR-4 Awaiting wallet · SR-5 Sent · SR-6 Refunding · SR-7 Rejected · SR-8 Reverted · SR-9 Gas / network · D5-1 Reading · D5-2 Refundable · D5-3 Already claimed · D5-4 Review · D5-5 Awaiting wallet · D5-6 Sent · D5-7 Confirmed · D5-8 Rejected · D5-9 Reverted · D5-10 Gas / network · D5-11 Not offered · D6-1 Form · D6-2 Disabled · D6-3 Review · D6-4 Submitting · D6-5 Queued · D6-6 Job confirmed · D6-7 Job failed · D6-8 Cap exceeded · D6-9 Not enough slots · D6-10 Not active / window closed · D6-11 Wallet missing',
  },
  {
    id: 'S05',
    screen: 'Tree (D07)',
    mockup: 'shared-pages.jsx',
    route: '/trees/:treeId',
    fixture: 'treeDetail() (trees.md §1, flags.md §1)',
    doc: 's05-tree',
    stateCount: 47,
    states:
      'T-1 Loading · T-2 Not found · T-3 Load failed · T-4 Offline · T-5 Alive · T-6 Flagged · T-7 Dead · T-8 Removed · T-9 Completed · T-10 Location exact · T-11 Location approximate · T-12 Tag issued / none · T-13 Reprint · T-14 Signed-in note · T-15 Untitled campaign · T-16 Phone width · TL-1 Empty · TL-2 Planted row · TL-3 Check-in row · TL-4 Check-in, month unknown · TL-5 Status rows · TL-6 Replanted row · TL-7 Flag resolved row · TL-8 Evidence details · TL-9 Thumbnail failed · M-1 Schedule · M-2 Missed · M-3 Payouts · M-4 No payouts · M-5 Lifecycle · F-1 No flags · F-2 Flag facts · F-3 Resolve link · F-4 Form hidden · F-5 Form · F-6 Reason too short · F-7 Review · F-8 Saving · F-9 Reason saved · F-10 Awaiting wallet · F-11 Sent · F-12 Opened · F-13 Pending callout · F-14 Wallet rejected · F-15 Reverted · F-16 Gas / network · F-17 Refused by API',
  },
  {
    id: 'S06',
    screen: 'Impact report',
    mockup: 'report.jsx',
    route: '/campaigns/:address/report',
    fixture: 'campaignReport() (reports.md §1)',
    doc: 's06-report',
    stateCount: 22,
    states:
      'R-1 Loading · R-2 Unavailable · R-3 Not found · R-4 Ready · R-5 Before planting · R-6 Planted · R-7 Payouts · R-8 No payouts · R-9 Not estimated · R-10 Estimated · R-11 Funnel · R-12 Batches · R-13 No issuance · E-1 Evidence rows · E-2 Evidence empty · E-3 Roster note · E-4 More evidence · E-5 Loading more · E-6 Load more failed · E-7 Event labels · R-14 Untitled campaign · R-15 Phone width',
  },
  {
    id: 'S07',
    screen: 'Carbon credits',
    mockup: 'carbon.jsx',
    route: '/carbon',
    fixture: 'carbonBatches() (carbon.md §1 + batches 103–105)',
    doc: 's07-carbon',
    stateCount: 11,
    states:
      '1 Loading · 2 Ready · 3 Empty · 4 No match · 5 Filtered · 6 Error · 7 Offline · 8 Card available · 9 Card sold out · 10 Card sales paused · 11 Card price not set',
  },
  {
    id: 'S08',
    screen: 'Batch (D08)',
    mockup: 'carbon.jsx',
    route: '/carbon/:batchId',
    fixture: 'carbonBatch() (carbon.md §2, buyer §3) + chainState()',
    doc: 's08-batch',
    stateCount: 23,
    states:
      '1 Loading · 2 Ready · 3 Batch not found · 4 Error · 4b Offline · 5 Wallet not ready · 6 Planter · 7 Signed out · 8 Sales paused · 9 Sold out · 10 Price not set · 11 Edit · 12 Invalid amount · 13 Checking · 13b Price changed · 14 Approval needed · 15 Approving · 16 Ready to buy · 17 Confirming purchase · 18 Indexing · 19 Purchase complete · 20 Rejected · 21 Failed',
  },
  {
    id: 'S09',
    screen: 'Certificate',
    mockup: 'my-carbon.jsx',
    route: '/carbon/retirements/:retirementId',
    fixture: 'retirement() (carbon.md §5)',
    doc: 's09-certificate',
    stateCount: 11,
    states:
      '1 Loading · 2 Not found · 3 Error · 4 Offline · 5 Registry Pending · 6 Registry Done · 7 Done, no reference · 8 No purpose · 9 Link copied · 10 Clipboard refused · 11 Printing',
  },
  {
    id: 'S10',
    screen: 'Reproduce',
    mockup: 'audit-pages.jsx',
    route: '/audit/:sessionId/reproduce',
    fixture: 'reproduceSessions() (audit §9)',
    doc: 's10-reproduce',
    stateCount: 13,
    states:
      '1 Loading · 2 Session not found · 3 Error · 4 Offline · 5 Recomputing · 6 Open, sample Match · 7 Sample Mismatch · 8 Closed, report Match · 9 Closed, report Mismatch · 10 Tamper on · 11 Tamper off · 12 Private notes sealed · 13 Recomputation failed',
  },
  {
    id: 'S11',
    screen: 'Profile (D01)',
    mockup: 'shared-pages.jsx',
    route: '/app/profile',
    fixture: 'meProfiles() + profileUpdate() (accounts.md §2)',
    doc: 's11-profile',
    stateCount: 29,
    states:
      'PF-1 Loading · PF-2 Donor · PF-3 Planter · PF-4 Auditor / Operator · PF-5 Display name null · PF-6 Wallet not ready · PF-7 Editing · PF-8 Draft restored · PF-9 Name blank · PF-10 Saving (optimistic) · PF-11 Saved · PF-12 Nothing changed · PF-13 Save rejected, field · PF-14 Save rejected, other · PF-15 Save failed · PF-16 Review to Planter, accepted earlier · PF-17 D01 to Planter, not accepted · PF-18 Review to Donor · PF-19 Switching · PF-20 Switched · PF-21 Agreement required · PF-22 Role locked · PF-23 Switch failed · PF-24 Wallet copied · PF-25 Copy blocked · PF-26 Signing out · PF-27 Offline · PF-28 Session expired · PF-29 Wallet already linked',
  },
  {
    id: 'S12',
    screen: 'Job',
    mockup: 'shared-pages.jsx',
    route: '/app/jobs/:id',
    fixture: 'jobs() (jobs.md §2)',
    doc: 's12-job',
    stateCount: 16,
    states:
      'JB-1 Loading · JB-2 Pending · JB-3 Processing · JB-4 Sent · JB-5 Confirmed · JB-6 Confirmed score · JB-7 Failed · JB-8 Last error · JB-9 Fell back · JB-10 Unlabelled kind · JB-11 Not found · JB-12 Error · JB-13 Poll failed with data · JB-14 Offline · JB-15 Tab hidden · JB-16 Session expired',
  },
  {
    id: 'S13',
    screen: 'Donor home',
    mockup: 'donor.jsx',
    route: '/app/donor',
    fixture: 'donorDashboard() (donor.md §1, §2)',
    doc: 's13-donor-home',
    stateCount: 19,
    states:
      'S-1 Loading · S-2 Load failed · S-3 Offline with snapshot · S-4 Refreshed · S-5 Empty · S-6 Ready · S-7 Tab empty · S-8 Wallet missing · S-9 Card not planted · S-10 Card no carbon · S-11 Card carbon · S-12 More cards · S-13 Loading more · S-14 Load more failed · S-15 Flags rail · S-16 Flag open / pending · S-17 No flags · S-18 Forbidden · S-19 Phone width',
  },
  {
    id: 'S14',
    screen: 'Create campaign',
    mockup: 'create-campaign.jsx',
    route: '/app/campaigns/new',
    fixture: 'speciesList() (campaigns.md §3) + chainState()',
    doc: 's14-create-campaign',
    stateCount: 21,
    states:
      'CC-1 Step 1 · CC-2 Step 2 · CC-3 Step 3 · CC-4 Step invalid · CC-5 Step focus · CC-6 Preview · CC-7 Species loading / failed · CC-8 Saving · CC-9 Preflight failed · CC-10 Wallet · CC-11 Submitted · CC-12 Indexing · CC-13 Complete · CC-14 Rejected · CC-15 Failed · CC-16 Gas / network · CC-17 Save refused · CC-18 Save failed · CC-19 Forbidden · CC-20 Operator on behalf · CC-21 Phone width',
  },
  {
    id: 'S15',
    screen: 'My carbon (D09, D10)',
    mockup: 'my-carbon.jsx',
    route: '/app/carbon?tab=',
    fixture: 'carbonHoldings() (carbon.md §3) + chainState()',
    doc: 's15-my-carbon',
    stateCount: 33,
    states:
      '1 Signed out · 2 Loading · 3 Wallet not ready · 4 Error · 5 Offline · 6 Ready · 7 Issued balances · 8 No issued balance · 9 Reservations · 10 Reservation declined · 11 Fully issued · 12 No reservations · 13 Retirements · 14 No purpose · 15 No retirements · 16 More retirements · 17 Loading more · 18 Load more failed · D09: 19 Edit · 20 Review · 21 Pending · 22 Indexing · 23 Released · 24 Rejected · 25 Failed · D10: 26 Edit · 27 Invalid · 28 Review · 29 Pending · 30 Indexing · 31 Retired · 32 Rejected · 33 Failed',
  },
  {
    id: 'S16',
    screen: 'My trees',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/trees',
    fixture: 'planterTrees() (planter.md §1)',
    doc: 's16-my-trees',
    stateCount: 16,
    states:
      'Loading · Ready · Ready, no trees at all · Empty filter · Filter loading · Load more · Load more failed · Card check-in open · Card check-in held · Card dead before deadline · Card flagged · Card removed / completed · Wallet not ready · Error · Offline · Forbidden',
  },
  {
    id: 'S17',
    screen: 'Slots',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/slots',
    fixture: 'planterSlots() (planter.md §2)',
    doc: 's17-slots',
    stateCount: 9,
    states:
      'Loading · Ready · Empty · Card, tag issued · Card, no tag · Wallet not ready · Error · Offline · Forbidden',
  },
  {
    id: 'S18',
    screen: 'Challenges',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/challenges',
    fixture: 'planterChallenges() (planter.md §3)',
    doc: 's18-challenges',
    stateCount: 14,
    states:
      'Loading · Ready · Empty · Answerable · Check-in already sent · Paused · Waiting for a window · Last day · Expired while open · Load more / failed · Wallet not ready · Error · Offline · Forbidden',
  },
  {
    id: 'S19',
    screen: 'Record',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/record?tree=&kind= · ?campaign=&slot=&kind=PLANTED',
    fixture: 'captureTarget() (evidence.md §1) + fakeCamera() + gpsFix() + deviceKey()',
    doc: 's19-record',
    stateCount: 39,
    states:
      'Loading target · Bad link · Target not found · Blocked, held · Blocked, other · Wallet not ready · Idle · No key · Key not registered · Starting · Camera denied · No camera · No GPS API · Location denied · GPS unavailable · Cannot record · Live, waiting for fix · Live, good fix · Live, coarse fix · QR hint · No QR hint · Recording · Sealing · Key vanished · Too large · Review · Review, offline · Sending · Sent, checking · Sent, rejected · Refused before upload · Upload failed · Payload mismatch · Saved offline · Retake · Offline, target cached · Offline, no target · Forbidden · Sign-out with queue or key',
  },
  {
    id: 'S20',
    screen: 'Uploads',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/uploads',
    fixture: 'planterUploads() (planter.md §4) + localQueueRow()',
    doc: 's20-uploads',
    stateCount: 23,
    states:
      'Loading · Ready · Empty · Online · Offline · Waiting card · Discard confirm · Discarded · Sending · Send refused (target) · Send failed · Video not uploaded · Sent, moving · Needs review · On-chain · Rejected · Failed · Load more / failed · Error · Forbidden · Expired local row · Queued with a revoked key · Sign-out with waiting rows',
  },
  {
    id: 'S21',
    screen: 'Evidence',
    mockup: 'planter-pages.jsx',
    route: '/app/evidence/:id',
    fixture: 'evidenceSubmission() (evidence.md §4, fixtures A and B)',
    doc: 's21-evidence',
    stateCount: 20,
    states:
      'Loading · Not found · Queued · Checking · Scored · Needs review · Attested · On-chain · Rejected, prechecks · Rejected, policy · Rejected, operator · Failed · Local clip · Keyframes · No media · Keyframe link expired · Record again · Poll failed · Error · Offline',
  },
  {
    id: 'S22',
    screen: 'Device (D02, D03)',
    mockup: 'planter-pages.jsx',
    route: '/app/planter/device',
    fixture: 'devices() (devices.md) + deviceKey()',
    doc: 's22-device',
    stateCount: 22,
    states:
      'Loading · Ready · No key yet · Key missing · Registering · Registered · Cannot create key · Limit reached · Already registered · Label invalid · Register failed · D03 review · D03 review, queued recordings · Revoking · Revoked · Revoke failed · Revoke target gone · Cancel · Offline · Error · Forbidden · Sign-out with a key',
  },
  {
    id: 'S23',
    screen: 'Audit',
    mockup: 'audit-pages.jsx',
    route: '/app/audit',
    fixture: 'auditSessions() (audit §1–§2)',
    doc: 's23-open-audit',
    stateCount: 15,
    states:
      '1 Forbidden · 2 Loading · 3 Ready · 4 Empty · 5 List error · 6 Campaigns error · 7 Offline · 8 Opening · 9 No trees · 10 Sample size invalid · 11 Campaign invalid · 12 Open failed · 13 More pages · 14 Load-more failed · 15 Signed out',
  },
  {
    id: 'S24',
    screen: 'Audit session (D13)',
    mockup: 'audit-pages.jsx',
    route: '/app/audit/:sessionId',
    fixture: 'auditSession() (audit §3)',
    doc: 's24-audit-session',
    stateCount: 13,
    states:
      '1 Forbidden · 2 Loading · 3 Session not found · 4 Error · 5 Offline · 6 Open, findings incomplete · 7 Open, findings complete · 8 Close review · 9 Closing · 10 Close refused · 11 Close failed · 12 Closed, read-only · 13 Summary too long',
  },
  {
    id: 'S25',
    screen: 'Sampled tree (D11, D12)',
    mockup: 'audit-pages.jsx',
    route: '/app/audit/:sessionId/trees/:treeId',
    fixture: 'sampledTree() (audit §3, §4)',
    doc: 's25-sampled-tree',
    stateCount: 23,
    states:
      '1 Forbidden · 2 Loading · 3 Session not found · 4 Tree not in sample · 5 Error · 6 Offline · 7 No submissions · 8 No integrity results · 9 Integrity mismatch · 10 D11 no finding · 11 D11 review again · 12 D11 saving · 13 D11 saved · 14 D11 refused, closed · 15 Closed, read-only · 16 D12 no challenge · 17 D12 open challenge · 18 D12 answered / expired · 19 D12 review · 20 D12 issuing · 21 D12 issued · 22 D12 refused · 23 Notes too long',
  },
  {
    id: 'S26',
    screen: 'Audit report',
    mockup: 'audit-pages.jsx',
    route: '/app/audit/:sessionId/report',
    fixture: 'auditReport() (audit §7)',
    doc: 's26-audit-report',
    stateCount: 12,
    states:
      '1 Forbidden · 2 Loading · 3 Session not found · 4 Report not closed · 5 Error · 6 Offline · 7 Ready · 8 No summary · 9 No challenges · 10 Private notes sealed · 11 Copied · 12 Copy refused',
  },
  {
    id: 'S27',
    screen: 'Campaign operations (D14)',
    mockup: 'operator-pages.jsx',
    route: '/app/operator/campaigns/:address',
    fixture: 'operatorCampaign() (operations.md §1, carbon.md §1)',
    doc: 's27-campaign-operations',
    stateCount: 25,
    states:
      '1 Forbidden · 2 Loading · 3 Error · 4 Not found · 5 Offline · 6 Anchor assignment · 7 Anchor, not active · 8 Anchor, no slots · 9 Carbon estimate · 10 Not computed · 11 Current · 12 Locked · 13 Estimate, not active · 14 Species unknown · 15 Mirror issuance · 16 Not issuable · 17 Price loading / error · 18 No batches · 19 Inventory price · 20 Requested, not indexed · 21 D14 review / busy / done / error · 22 Job queued · 23 Job confirmed · 24 Job failed · 25 Known submission',
  },
  {
    id: 'S28',
    screen: 'Review (D14)',
    mockup: 'operator-pages.jsx',
    route: '/app/operator/submissions/:id',
    fixture: 'evidenceSubmission() (evidence.md §4) + jobs()',
    doc: 's28-review',
    stateCount: 15,
    states:
      '1 Forbidden · 2 Loading · 3 Error · 4 Not found · 5 Offline · 6 Needs review · 7 Note blank · 8 Not scored · 9 D14 review / busy / done / error · 10 Approved · 11 On-chain · 12 Rejected · 13 Not waiting · 14 Failed with a job · 15 Cannot attest',
  },
  {
    id: 'S29',
    screen: 'Resolve flag (D14)',
    mockup: 'operator-pages.jsx',
    route: '/app/operator/trees/:treeId/flags/:flagId',
    fixture: 'operatorFlag() (flags.md §2–§3)',
    doc: 's29-resolve-flag',
    stateCount: 12,
    states:
      '1 Forbidden · 2 Loading · 3 Error · 4 Not found · 5 Offline · 6 Form · 7 Note too short · 8 D14 review / busy / done / error · 9 Resolution pending · 10 Job failed · 11 Resolved · 12 Not on-chain yet',
  },
];

export const statesOf = (row: MatrixRow): string[] => row.states.split(' · ');
