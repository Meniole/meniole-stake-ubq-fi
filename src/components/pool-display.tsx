import { useAppKitAccount } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { stakingContract } from "../constants/contracts";
import { useErc20Token } from "../hooks/erc20Token";
import { useState } from "react";
import { Button } from "./button";
import { usePoolData } from "../hooks/usePoolData";
import { useStakingActions } from "../hooks/useStakingActions";
import { safeFormatUnits, safeParseUnits, calculatePoolRewardPerDay, calculateUserPoolShare, calculateUserRewardPerDay } from "../utils";
import type { Address } from "viem";

interface PoolDisplayProps {
  poolId?: bigint;
}

export function PoolDisplay({ poolId = 0n }: PoolDisplayProps) {
  const { address, isConnected } = useAppKitAccount();

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

  const lpTokenAddress = poolInfo.data?.lpToken as Address | undefined;
  const lpTokenInfo = useErc20Token(lpTokenAddress);
  const rewardTokenAddress = stakingSettings.data?.[0] as Address | undefined;
  const rewardTokenInfo = useErc20Token(rewardTokenAddress);

  const poolData = usePoolData({
    poolId,
    address,
    lpTokenAddress,
    isConnected,
  });

  const stakingActions = useStakingActions({
    poolId,
    lpTokenAddress,
    lpTokenDecimals: lpTokenInfo.data?.decimals ?? 18,
    onTransactionComplete: () => {
      poolInfo.refetch();
      poolData.refetchAll();
    },
  });

  if (
    stakingSettings.error ||
    lpTokenInfo.error ||
    rewardTokenInfo.error ||
    poolInfo.error ||
    (isConnected && (poolData.pendingRewards.error || poolData.userInfo.error || poolData.allowance.error || poolData.balance.error))
  ) {
    return (
      <div className="pool-container">
        <div style={{ padding: "20px", color: "#ff6666" }}>Failed to load pool data. Please check your connection and try again.</div>
      </div>
    );
  }

  if (
    stakingSettings.data === undefined ||
    lpTokenInfo.data === undefined ||
    rewardTokenInfo.data === undefined ||
    poolInfo.data === undefined ||
    (isConnected &&
      (poolData.pendingRewards.data === undefined ||
        poolData.userInfo.data === undefined ||
        poolData.allowance.data === undefined ||
        poolData.balance.data === undefined))
  ) {
    return (
      <div className="pool-container">
        <div className="loading-container">
          <div className="spinner button-spinner"></div>
          <span>Loading pool information...</span>
        </div>
      </div>
    );
  }

  const parsedStakeAmount = safeParseUnits(stakeAmount, lpTokenInfo.data.decimals);
  const parsedUnstakeAmount = safeParseUnits(unstakeAmount, lpTokenInfo.data.decimals);
  const isAllowanceSufficient = poolData.allowance.data !== undefined && parsedStakeAmount !== null ? poolData.allowance.data >= parsedStakeAmount : false;

  const rewardPerBlock = stakingSettings.data[3];
  const poolAllocPoints = poolInfo.data.allocationPoints;
  const totalAllocPoints = stakingSettings.data[6];

  const poolRewardPerDay = calculatePoolRewardPerDay(rewardPerBlock, poolAllocPoints, totalAllocPoints, rewardTokenInfo.data.decimals);
  const userPoolShare =
    poolData.userInfo.data && poolInfo.data.amount > 0n
      ? calculateUserPoolShare(poolData.userInfo.data.amount, poolInfo.data.amount, lpTokenInfo.data.decimals)
      : null;
  const userRewardPerDay = calculateUserRewardPerDay(userPoolShare, poolRewardPerDay);

  const isWritingContract = isApproving || isStaking || isUnstaking || isClaiming;

  return (
    <div>
      <div className="pool-container">
        <div className="pool-title">{lpTokenInfo.data.name} Pool</div>
        <div>
          Total Staked: {safeFormatUnits(poolInfo.data.amount, lpTokenInfo.data.decimals)} {lpTokenInfo.data.symbol}
        </div>
        <div>
          Your Stake: {poolData.userInfo.data ? safeFormatUnits(poolData.userInfo.data.amount, lpTokenInfo.data.decimals) : "-"} {lpTokenInfo.data.symbol}{" "}
          {userPoolShare && userPoolShare > 0.0001 ? `(${(userPoolShare * 100).toFixed(2)}% of pool)` : ""}
        </div>

        <div className="stake-row-container">
          <div className="column-container">
            <div className="max-amount">
              Max:{" "}
              <span onClick={() => setStakeAmount(safeFormatUnits(poolData.balance.data, lpTokenInfo.data.decimals))}>
                {safeFormatUnits(poolData.balance.data, lpTokenInfo.data.decimals)} {lpTokenInfo.data.symbol}
              </span>
            </div>
            <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
            <Button
              className="action-button"
              disabled={
                isWritingContract ||
                !isConnected ||
                poolData.balance.data === undefined ||
                isAllowanceSufficient ||
                !parsedStakeAmount ||
                parsedStakeAmount <= 0 ||
                parsedStakeAmount > poolData.balance.data
              }
              onClick={() => stakingActions.executeApprove(stakeAmount, () => setIsApproving(false))}
              isLoading={isApproving}
              isLoadingText="Approving..."
            >
              Approve
            </Button>
            <Button
              className="action-button"
              disabled={
                isWritingContract ||
                !isConnected ||
                poolData.balance.data === undefined ||
                !isAllowanceSufficient ||
                !parsedStakeAmount ||
                parsedStakeAmount <= 0 ||
                parsedStakeAmount > poolData.balance.data
              }
              onClick={() => stakingActions.executeStake(stakeAmount, () => setIsStaking(false))}
              isLoading={isStaking}
              isLoadingText="Staking..."
            >
              Stake
            </Button>
          </div>
          <div className="column-container">
            <div className="max-amount">
              Max:{" "}
              <span onClick={() => setUnstakeAmount(safeFormatUnits(poolData.userInfo.data?.amount, lpTokenInfo.data.decimals))}>
                {poolData.userInfo.data ? safeFormatUnits(poolData.userInfo.data.amount, lpTokenInfo.data.decimals) : "-"} {lpTokenInfo.data.symbol}
              </span>
            </div>
            <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
            <Button
              className="action-button"
              disabled={
                isWritingContract ||
                !isConnected ||
                !poolData.userInfo.data ||
                poolData.balance.data === undefined ||
                !parsedUnstakeAmount ||
                parsedUnstakeAmount <= 0 ||
                parsedUnstakeAmount > poolData.userInfo.data.amount
              }
              onClick={() => stakingActions.executeUnstake(unstakeAmount, () => setIsUnstaking(false))}
              isLoading={isUnstaking}
              isLoadingText="Unstaking..."
            >
              Unstake
            </Button>
          </div>
        </div>

        <div>
          <div>
            Pending Rewards:{" "}
            {poolData.pendingRewards.data !== undefined ? Number(safeFormatUnits(poolData.pendingRewards.data, rewardTokenInfo.data.decimals)).toFixed(2) : "-"}{" "}
            {rewardTokenInfo.data.symbol}
          </div>
          <div>
            Reward Per Day: {userRewardPerDay !== null ? userRewardPerDay.toFixed(2) : "-"} {rewardTokenInfo.data?.symbol}
          </div>
          <Button
            className="action-button"
            onClick={() => stakingActions.executeClaim(() => setIsClaiming(false))}
            isLoading={isClaiming}
            isLoadingText="Claiming rewards..."
            disabled={isWritingContract || !isConnected || !poolData.pendingRewards.data}
          >
            Claim Rewards
          </Button>
        </div>
      </div>
    </div>
  );
}
