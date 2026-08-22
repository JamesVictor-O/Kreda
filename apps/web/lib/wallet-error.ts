import { BaseError } from "viem";

/** viem/wagmi errors' .message is a multi-line dev-facing dump — calldata,
 * contract addresses, a docs link, the viem version — not something to
 * show a user. .shortMessage is the one-line human summary it's built
 * from. Wallet rejection gets its own copy since "User rejected the
 * request." reads like something went wrong rather than something the
 * user chose to do. */
export function friendlyWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof BaseError) {
    if (/rejected|denied/i.test(error.shortMessage)) {
      return "You rejected the request in your wallet.";
    }
    return error.shortMessage;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
