import { createPublicClient, http } from "viem";
import { activeChain } from "@/lib/chains";
import { attestationAbi, receivableVaultAbi } from "@/lib/contracts/abis";

/// Server-side reads only — a plain viem publicClient rather than wagmi's
/// hooks, since these run in Server Components ahead of any wallet
/// connection. Writes (which need the connected wallet) go through wagmi
/// in client components instead — see deposit-panel.tsx.

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

export async function getAttestationRecord(attestationContract: `0x${string}`, attestationId: `0x${string}`) {
  return publicClient.readContract({
    address: attestationContract,
    abi: attestationAbi,
    functionName: "get",
    args: [attestationId],
  });
}

export async function getVaultOnChainState(vaultAddress: `0x${string}`) {
  const [state, totalAssets, targetAmount, funded, settled] = await Promise.all([
    publicClient.readContract({ address: vaultAddress, abi: receivableVaultAbi, functionName: "state" }),
    publicClient.readContract({
      address: vaultAddress,
      abi: receivableVaultAbi,
      functionName: "totalAssets",
    }),
    publicClient.readContract({
      address: vaultAddress,
      abi: receivableVaultAbi,
      functionName: "targetAmount",
    }),
    publicClient.readContract({ address: vaultAddress, abi: receivableVaultAbi, functionName: "funded" }),
    publicClient.readContract({ address: vaultAddress, abi: receivableVaultAbi, functionName: "settled" }),
  ]);
  return { state, totalAssets, targetAmount, funded, settled };
}
