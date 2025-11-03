import { type Address } from "viem";
import { useReadContract } from "wagmi";
import { stakingContract } from "../constants/contracts";
import erc20Abi from "../abis/erc20";
import { toValidAddress } from "../utils";

interface UsePoolDataParams {
  poolId: bigint;
  address: string | undefined;
  lpTokenAddress: Address | undefined;
  isConnected: boolean;
}

export const usePoolData = ({ poolId, address, lpTokenAddress, isConnected }: UsePoolDataParams) => {
  const validAddress = toValidAddress(address);

  const userInfo = useReadContract({
    ...stakingContract,
    functionName: "getStakingUserInfo",
    args: [poolId, validAddress],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const pendingRewards = useReadContract({
    ...stakingContract,
    functionName: "getPendingStakingRewards",
    args: [poolId, validAddress],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const allowance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "allowance",
    args: [validAddress, stakingContract.address],
    query: {
      enabled: isConnected && !!address && !!lpTokenAddress,
    },
  });

  const balance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "balanceOf",
    args: [validAddress],
    query: {
      enabled: isConnected && !!address && !!lpTokenAddress,
    },
  });

  const refetchAll = () => {
    userInfo.refetch();
    pendingRewards.refetch();
    allowance.refetch();
    balance.refetch();
  };

  return {
    userInfo,
    pendingRewards,
    allowance,
    balance,
    refetchAll,
  };
};
