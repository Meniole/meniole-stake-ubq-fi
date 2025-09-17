import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import erc20Abi from "../abis/erc20.ts";
import { stakingContract } from "../constants/contracts.ts";
import { BaseError, formatUnits, parseUnits } from "viem";
import { useErc20Token } from "../hooks/erc20Token.ts";
import { useState } from "react";
import { waitForTransactionReceipt } from "viem/actions";

interface PoolDisplayProps {
  poolId?: bigint;
  setErrorMessage: (msg: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  clearMessages: () => void;
}

export function PoolDisplay({ poolId = 0n, setErrorMessage, setSuccessMessage, clearMessages }: PoolDisplayProps) {
  const account = useAccount();
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const stakingSettings = useReadContract({
    ...stakingContract,
    functionName: "getStakingSettings",
    args: [],
  });
  const poolInfo = useReadContract({
    ...stakingContract,
    functionName: "getStakingPoolInfo",
    args: [poolId],
  });
  const lpTokenAddress = poolInfo.data?.lpToken;
  const lpTokenInfo = useErc20Token(lpTokenAddress);
  const rewardTokenAddress = stakingSettings.data?.[0];
  const rewardTokenInfo = useErc20Token(rewardTokenAddress);

  const userInfo = useReadContracts({
    contracts: [
      {
        ...stakingContract,
        functionName: "getStakingUserInfo",
        args: [poolId, account.address ?? "0x0"],
      },
      {
        ...stakingContract,
        functionName: "getPendingStakingRewards",
        args: [poolId, account.address ?? "0x0"],
      },
    ],
    query: {
      enabled: account.isConnected && !!account.address,
    },
  });
  const userInfoData = userInfo.data?.[0];
  const pendingRewardsData = userInfo.data?.[1];

  const allowance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "allowance",
    args: [account.address ?? "0x0", stakingContract.address],
    query: {
      enabled: account.isConnected && !!account.address && !!lpTokenAddress,
    },
  });
  const balance = useReadContract({
    abi: erc20Abi,
    address: lpTokenAddress,
    functionName: "balanceOf",
    args: [account.address ?? "0x0"],
    query: {
      enabled: account.isConnected && !!account.address && !!lpTokenAddress,
    },
  });

  const onSuccess = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    try {
      const receipt = await waitForTransactionReceipt(publicClient, { hash });
      if (receipt.status === "success") {
        setSuccessMessage("Transaction confirmed");
      } else {
        setErrorMessage("Transaction reverted");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transaction failed");
    }
    refreshData();
  };

  const onError = (error: unknown) => {
    if (error instanceof BaseError) {
      setErrorMessage(error.shortMessage);
    } else if (error instanceof Error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage("An unknown error occurred");
    }
  };

  const claim = () => {
    clearMessages();
    setIsClaiming(true);
    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, 0n],
      },
      {
        onSuccess: onSuccess,
        onError: onError,
        onSettled: () => {
          setIsClaiming(false);
        },
      }
    );
  };

  const stake = () => {
    if (!lpTokenInfo.data) return;
    clearMessages();
    setIsStaking(true);
    writeContract(
      {
        ...stakingContract,
        functionName: "stake",
        args: [poolId, parseUnits(stakeAmount, lpTokenInfo.data.decimals)],
      },
      {
        onSuccess: onSuccess,
        onError: onError,
        onSettled: () => {
          setIsStaking(false);
        },
      }
    );
  };

  const unstake = () => {
    if (!lpTokenInfo.data) return;
    clearMessages();
    setIsUnstaking(true);
    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, parseUnits(unstakeAmount, lpTokenInfo.data.decimals)],
      },
      {
        onSuccess: onSuccess,
        onError: onError,
        onSettled: () => {
          setIsUnstaking(false);
        },
      }
    );
  };

  const approveAllowance = () => {
    if (!lpTokenAddress || !lpTokenInfo.data) return;
    clearMessages();
    setIsApproving(true);
    writeContract(
      {
        abi: erc20Abi,
        address: lpTokenAddress,
        functionName: "approve",
        args: [stakingContract.address, parseUnits(stakeAmount, lpTokenInfo.data.decimals)],
      },
      {
        onSuccess: onSuccess,
        onError: onError,
        onSettled: () => {
          setIsApproving(false);
        },
      }
    );
  };

  const refreshData = () => {
    poolInfo.refetch();
    userInfo.refetch();
    allowance.refetch();
    balance.refetch();
  };

  const isLoading =
    stakingSettings.data === undefined ||
    lpTokenInfo.data === undefined ||
    rewardTokenInfo.data === undefined ||
    poolInfo.data === undefined ||
    (account.isConnected && (userInfo.data === undefined || allowance.data === undefined || balance.data === undefined));

  if (isLoading) return <div className="permits-list">Loading...</div>;

  const parsedStakeAmount = lpTokenInfo.data && !Number.isNaN(Number(stakeAmount)) ? parseUnits(stakeAmount, lpTokenInfo.data.decimals) : null;
  const parsedUnstakeAmount = lpTokenInfo.data && !Number.isNaN(Number(unstakeAmount)) ? parseUnits(unstakeAmount, lpTokenInfo.data.decimals) : null;

  const isAllowanceSufficient =
    lpTokenInfo.data !== undefined && allowance.data !== undefined && parsedStakeAmount !== null ? allowance.data >= parsedStakeAmount : false;

  return (
    <div>
      <div className="permits-list" style={{ padding: "20px" }}>
        <div style={{ fontSize: "1.1em", marginBottom: "10px" }}>{lpTokenInfo.data?.name} Pool</div>
        <div>
          Total Staked: {lpTokenInfo.data && poolInfo.data ? formatUnits(poolInfo.data.amount, lpTokenInfo.data?.decimals) : "-"}{" "}
          {lpTokenInfo.data?.symbol}
        </div>
        <div>
          Your Stake:{" "}
          {userInfoData && userInfoData.result && lpTokenInfo.data ? formatUnits(userInfoData.result.amount, lpTokenInfo.data.decimals) : "-"}{" "}
          {lpTokenInfo.data?.symbol}
        </div>

        <div style={{ display: "flex", flexDirection: "row", margin: "30px 0 30px 0", justifyContent: "space-around" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="max-amount">
              Max:{" "}
              <span onClick={() => setStakeAmount(balance.data && lpTokenInfo.data ? formatUnits(balance.data, lpTokenInfo.data.decimals) : "")}>
                {balance.data !== undefined && lpTokenInfo.data ? formatUnits(balance.data, lpTokenInfo.data.decimals) : "-"}{" "}
                {lpTokenInfo.data?.symbol}
              </span>
            </div>
            <input type="text" placeholder="Amount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
            <button
              className="action-button"
              disabled={
                !account.isConnected ||
                balance.data === undefined ||
                isAllowanceSufficient ||
                !parsedStakeAmount ||
                parsedStakeAmount <= 0 ||
                parsedStakeAmount > balance.data
              }
              onClick={approveAllowance}
            >
              {isApproving ? (
                <>
                  <div className="spinner button-spinner"></div>
                  <span>Approving...</span>
                </>
              ) : (
                <span>Approve</span>
              )}
            </button>
            <button
              className="action-button"
              disabled={
                !account.isConnected ||
                !balance.data ||
                !isAllowanceSufficient ||
                !parsedStakeAmount ||
                parsedStakeAmount <= 0 ||
                parsedStakeAmount > balance.data
              }
              onClick={stake}
            >
              {isStaking ? (
                <>
                  <div className="spinner button-spinner"></div>
                  <span>Staking...</span>
                </>
              ) : (
                <span>Stake</span>
              )}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="max-amount">
              Max:{" "}
              <span
                onClick={() =>
                  setUnstakeAmount(userInfoData?.result && lpTokenInfo.data ? formatUnits(userInfoData.result.amount, lpTokenInfo.data.decimals) : "")
                }
              >
                {userInfoData?.result && lpTokenInfo.data ? formatUnits(userInfoData.result.amount, lpTokenInfo.data.decimals) : "-"}{" "}
                {lpTokenInfo.data?.symbol}
              </span>
            </div>
            <input type="text" pattern="\d+(\.\d+)?" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
            <button
              className="action-button"
              disabled={
                !account.isConnected || !balance.data || !parsedUnstakeAmount || parsedUnstakeAmount <= 0 || parsedUnstakeAmount > balance.data
              }
              onClick={unstake}
            >
              {isUnstaking ? (
                <>
                  <div className="spinner button-spinner"></div>
                  <span>Unstaking...</span>
                </>
              ) : (
                <span>Unstake</span>
              )}
            </button>
          </div>
        </div>

        <div>
          <div>
            Pending Rewards:{" "}
            {pendingRewardsData ? Number(formatUnits(pendingRewardsData.result ?? 0n, rewardTokenInfo.data?.decimals ?? 18)).toFixed(2) : "-"}{" "}
            {rewardTokenInfo.data?.symbol}
          </div>
          <button onClick={claim} disabled={!account.isConnected || (pendingRewardsData?.result ?? 0n) === 0n}>
            {isClaiming ? (
              <>
                <div className="spinner button-spinner"></div>
                <span>Claiming...</span>
              </>
            ) : (
              <span>Claim Rewards</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
