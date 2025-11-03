import { type Address, zeroAddress, isAddress, formatUnits, parseUnits } from "viem";

export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getChainName = (chainId: number | undefined, chains: Array<{ id: number; name: string }>): string => {
  return chainId ? chains.find((c) => c.id === chainId)?.name || `Chain ${chainId}` : "Unknown Chain";
};

export const toValidAddress = (address: string | Address | undefined): Address => {
  return address && isAddress(address) ? (address as Address) : zeroAddress;
};

export const safeFormatUnits = (value: bigint | undefined, decimals: number): string => {
  return value !== undefined ? formatUnits(value, decimals) : "0";
};

export const safeParseUnits = (value: string, decimals: number): bigint | null => {
  if (!value || Number.isNaN(Number(value))) return null;
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
};

export const calculatePoolRewardPerDay = (
  rewardPerBlock: bigint,
  poolAllocPoints: bigint,
  totalAllocPoints: bigint,
  rewardDecimals: number,
  blocksPerDay = 7167
): number | null => {
  if (totalAllocPoints <= 0n) return null;
  const rewardPerBlockForPool = (rewardPerBlock * poolAllocPoints) / totalAllocPoints;
  return Number(formatUnits(rewardPerBlockForPool, rewardDecimals)) * blocksPerDay;
};

export const calculateUserPoolShare = (userAmount: bigint, totalPoolAmount: bigint, decimals: number): number | null => {
  if (totalPoolAmount <= 0n) return null;
  return Number(formatUnits(userAmount, decimals)) / Number(formatUnits(totalPoolAmount, decimals));
};

export const calculateUserRewardPerDay = (userPoolShare: number | null, poolRewardPerDay: number | null): number | null => {
  return userPoolShare && poolRewardPerDay ? userPoolShare * poolRewardPerDay : null;
};
