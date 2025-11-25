import { type Address, BaseError, parseUnits } from "viem";
import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import { stakingContract } from "../constants/contracts";
import erc20Abi from "../abis/erc20";
import { useStatusMessage } from "../context/status-message";
import { toValidAddress } from "../utils";

interface UseStakingParams {
  poolId: bigint;
  address: string | undefined;
  lpTokenAddress: Address | undefined;
  lpTokenDecimals: number;
  isConnected: boolean;
  onTransactionComplete: () => void;
}

export const useStaking = ({ poolId, address, lpTokenAddress, lpTokenDecimals, isConnected, onTransactionComplete }: UseStakingParams) => {
  const validAddress = toValidAddress(address);
  const publicClient = usePublicClient();
  const { setErrorMessage, setSuccessMessage, clearMessages } = useStatusMessage();

  const userInfo = useReadContract({
    ...stakingContract,
    functionName: "getStakingUserInfo",
    args: [poolId, validAddress],
    query: { enabled: isConnected && !!address },
  });

  const pendingRewards = useReadContract({
    ...stakingContract,
    functionName: "getPendingStakingRewards",
    args: [poolId, validAddress],
    query: { enabled: isConnected && !!address },
  });

  const allowance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "allowance",
    args: [validAddress, stakingContract.address],
    query: { enabled: isConnected && !!address && !!lpTokenAddress },
  });

  const balance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "balanceOf",
    args: [validAddress],
    query: { enabled: isConnected && !!address && !!lpTokenAddress },
  });

  const handleSuccess = async (hash: `0x${string}`) => {
    if (!publicClient) {
      setErrorMessage("No public client available");
      return;
    }

    try {
      const receipt = await waitForTransactionReceipt(publicClient, { hash });
      setSuccessMessage(receipt.status === "success" ? "Transaction confirmed" : "Transaction reverted");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transaction failed");
    }
    onTransactionComplete();
  };

  const handleError = (error: unknown) => {
    const message = error instanceof BaseError ? error.shortMessage || error.message : error instanceof Error ? error.message : "An unknown error occurred";
    setErrorMessage(message);
  };

  const { writeContract } = useWriteContract({
    mutation: {
      onSuccess: handleSuccess,
      onError: handleError,
    },
  });

  const executeStake = (amount: string) => {
    clearMessages();
    writeContract({
      ...stakingContract,
      functionName: "stake",
      args: [poolId, parseUnits(amount, lpTokenDecimals)],
    });
  };

  const executeUnstake = (amount: string) => {
    clearMessages();
    writeContract({
      ...stakingContract,
      functionName: "unstake",
      args: [poolId, parseUnits(amount, lpTokenDecimals)],
    });
  };

  const executeClaim = () => {
    clearMessages();
    writeContract({
      ...stakingContract,
      functionName: "unstake",
      args: [poolId, 0n],
    });
  };

  const executeApprove = (amount: string) => {
    if (!lpTokenAddress) {
      setErrorMessage("LP token address not available");
      return;
    }

    clearMessages();
    writeContract({
      abi: erc20Abi,
      address: lpTokenAddress,
      functionName: "approve",
      args: [stakingContract.address, parseUnits(amount, lpTokenDecimals)],
    });
  };

  const refetchAll = () => {
    userInfo.refetch();
    pendingRewards.refetch();
    allowance.refetch();
    balance.refetch();
  };

  return {
    data: { userInfo, pendingRewards, allowance, balance },
    actions: { executeStake, executeUnstake, executeClaim, executeApprove },
    refetchAll,
  };
};
