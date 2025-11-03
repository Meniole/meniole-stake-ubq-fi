import { type Address, zeroAddress, isAddress } from "viem";
import { formatUnits, parseUnits } from "viem";

export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const getChainName = (chainId: number | undefined, supportedChains: Array<{ id: number; name: string }>): string => {
  if (!chainId) return "Unknown Chain";
  const chain = supportedChains.find((c) => c.id === chainId);
  return chain?.name || `Chain ${chainId}`;
};

export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const toValidAddress = (address: string | Address | undefined): Address => {
  if (!address || !isAddress(address)) {
    return zeroAddress;
  }
  return address as Address;
};

export const isSafeAddress = (address: string | Address | undefined): address is Address => {
  return !!address && isAddress(address);
};

export const safeFormatUnits = (value: bigint | undefined, decimals: number): string => {
  if (value === undefined) return "0";
  return formatUnits(value, decimals);
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
  blocksPerDay: number = 7167
): number | null => {
  if (totalAllocPoints <= 0n) return null;

  const rewardPerBlockForPool = (rewardPerBlock * poolAllocPoints) / totalAllocPoints;
  return Number(formatUnits(rewardPerBlockForPool, rewardDecimals)) * blocksPerDay;
};

export const calculateUserPoolShare = (userAmount: bigint, totalPoolAmount: bigint, decimals: number): number | null => {
  if (totalPoolAmount <= 0n) return null;

  const userShare = Number(formatUnits(userAmount, decimals));
  const totalShare = Number(formatUnits(totalPoolAmount, decimals));

  return userShare / totalShare;
};

export const calculateUserRewardPerDay = (userPoolShare: number | null, poolRewardPerDay: number | null): number | null => {
  if (!userPoolShare || !poolRewardPerDay) return null;
  return userPoolShare * poolRewardPerDay;
};
