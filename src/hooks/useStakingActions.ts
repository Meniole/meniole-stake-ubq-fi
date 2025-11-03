import { type Address, BaseError, parseUnits } from "viem";
import { useWriteContract, usePublicClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import { stakingContract } from "../constants/contracts";
import erc20Abi from "../abis/erc20";
import { useStatusMessage } from "../context/status-message";

interface UseStakingActionsParams {
  poolId: bigint;
  lpTokenAddress: Address | undefined;
  lpTokenDecimals: number;
  onTransactionComplete: () => void;
}

export const useStakingActions = ({ poolId, lpTokenAddress, lpTokenDecimals, onTransactionComplete }: UseStakingActionsParams) => {
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();
  const { setErrorMessage, setSuccessMessage, clearMessages } = useStatusMessage();

  const handleSuccess = async (hash: `0x${string}`) => {
    if (!publicClient) {
      setErrorMessage("No public client available");
      return;
    }

    try {
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash,
        timeout: 15_000,
      });

      if (receipt.status === "success") {
        setSuccessMessage("Transaction confirmed");
      } else {
        setErrorMessage("Transaction reverted");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transaction failed");
    }
    onTransactionComplete();
  };

  const handleError = (error: unknown) => {
    if (error instanceof BaseError) {
      const shortMessage = error.shortMessage || error.message;
      setErrorMessage(shortMessage);
    } else if (error instanceof Error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage("An unknown error occurred");
    }
  };

  const executeStake = (amount: string, onSettled: () => void) => {
    clearMessages();
    const parsedAmount = parseUnits(amount, lpTokenDecimals);

    writeContract(
      {
        ...stakingContract,
        functionName: "stake",
        args: [poolId, parsedAmount],
      },
      {
        onSuccess: handleSuccess,
        onError: handleError,
        onSettled,
      }
    );
  };

  const executeUnstake = (amount: string, onSettled: () => void) => {
    clearMessages();
    const parsedAmount = parseUnits(amount, lpTokenDecimals);

    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, parsedAmount],
      },
      {
        onSuccess: handleSuccess,
        onError: handleError,
        onSettled,
      }
    );
  };

  const executeClaim = (onSettled: () => void) => {
    clearMessages();

    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, 0n],
      },
      {
        onSuccess: handleSuccess,
        onError: handleError,
        onSettled,
      }
    );
  };

  const executeApprove = (amount: string, onSettled: () => void) => {
    if (!lpTokenAddress) return;
    clearMessages();
    const parsedAmount = parseUnits(amount, lpTokenDecimals);

    writeContract(
      {
        abi: erc20Abi,
        address: lpTokenAddress,
        functionName: "approve",
        args: [stakingContract.address, parsedAmount],
      },
      {
        onSuccess: handleSuccess,
        onError: handleError,
        onSettled,
      }
    );
  };

  return {
    executeStake,
    executeUnstake,
    executeClaim,
    executeApprove,
  };
};
