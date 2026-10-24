const HEAD = 6;
const TAIL = 4;

/** shell.md §1: `0x4b9e…9d0e`. The one place an address is shortened. */
export const shortAddress = (address: string): string =>
  `${address.slice(0, HEAD)}…${address.slice(-TAIL)}`;
