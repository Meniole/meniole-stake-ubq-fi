import { useAppKitAccount } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { stakingContract } from "../constants/contracts";
import { useErc20Token } from "../hooks/erc20Token";
import { useState } from "react";
import { Button } from "./button";
import { useStaking } from "../hooks/useStaking";
import { safeFormatUnits, safeParseUnits, calculatePoolRewardPerDay, calculateUserPoolShare, calculateUserRewardPerDay } from "../utils";
import type { Address } from "viem";

interface PoolDisplayProps {
  poolId?: bigint;
}

export function PoolDisplay({ poolId = 0n }: PoolDisplayProps) {
  const { address, isConnected } = useAppKitAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isWriting, setIsWriting] = useState({ approve: false, stake: false, unstake: false, claim: false });

  const stakingSettings = useReadContract({ ...stakingContract, functionName: "getStakingSettings", args: [] });
  const poolInfo = useReadContract({ ...stakingContract, functionName: "getStakingPoolInfo", args: [poolId] });

  const lpTokenAddress = poolInfo.data?.lpToken as Address | undefined;
  const rewardTokenAddress = stakingSettings.data?.[0] as Address | undefined;
  const lpTokenInfo = useErc20Token(lpTokenAddress);
  const rewardTokenInfo = useErc20Token(rewardTokenAddress);

  const staking = useStaking({
    poolId,
    address,
    lpTokenAddress,
    lpTokenDecimals: lpTokenInfo.data?.decimals ?? 18,
    isConnected,
    onTransactionComplete: () => {
      poolInfo.refetch();
      staking.refetchAll();
    },
  });

  const hasError =
    stakingSettings.error || lpTokenInfo.error || rewardTokenInfo.error || poolInfo.error || (isConnected && Object.values(staking.data).some((d) => d.error));

  if (hasError) {
    return (
      <div className="pool-container">
        <div style={{ padding: "20px", color: "#ff6666" }}>Failed to load pool data. Please check your connection and try again.</div>
      </div>
    );
  }

  const isLoading =
    !stakingSettings.data ||
    !lpTokenInfo.data ||
    !rewardTokenInfo.data ||
    !poolInfo.data ||
    (isConnected && Object.values(staking.data).some((d) => d.data === undefined));

  if (isLoading) {
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
  const isAllowanceSufficient = staking.data.allowance.data !== undefined && parsedStakeAmount ? staking.data.allowance.data >= parsedStakeAmount : false;

  const poolRewardPerDay = calculatePoolRewardPerDay(
    stakingSettings.data[3],
    poolInfo.data.allocationPoints,
    stakingSettings.data[6],
    rewardTokenInfo.data.decimals
  );

  const userPoolShare =
    staking.data.userInfo.data && poolInfo.data.amount > 0n
      ? calculateUserPoolShare(staking.data.userInfo.data.amount, poolInfo.data.amount, lpTokenInfo.data.decimals)
      : null;

  const userRewardPerDay = calculateUserRewardPerDay(userPoolShare, poolRewardPerDay);
  const isWritingContract = Object.values(isWriting).some(Boolean);

  const setWriting = (key: keyof typeof isWriting, value: boolean) => setIsWriting((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="pool-container">
      <div className="pool-title">{lpTokenInfo.data.name} Pool</div>
      <div>
        Total Staked: {safeFormatUnits(poolInfo.data.amount, lpTokenInfo.data.decimals)} {lpTokenInfo.data.symbol}
      </div>
      <div>
        Your Stake: {staking.data.userInfo.data ? safeFormatUnits(staking.data.userInfo.data.amount, lpTokenInfo.data.decimals) : "-"} {lpTokenInfo.data.symbol}{" "}
        {userPoolShare && userPoolShare > 0.0001 ? `(${(userPoolShare * 100).toFixed(2)}% of pool)` : ""}
      </div>

      <div className="stake-row-container">
        <div className="column-container">
          <div className="max-amount">
            Max:{" "}
            <span onClick={() => setStakeAmount(safeFormatUnits(staking.data.balance.data, lpTokenInfo.data.decimals))}>
              {safeFormatUnits(staking.data.balance.data, lpTokenInfo.data.decimals)} {lpTokenInfo.data.symbol}
            </span>
          </div>
          <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
          <Button
            className="action-button"
            disabled={
              isWritingContract ||
              !isConnected ||
              !staking.data.balance.data ||
              isAllowanceSufficient ||
              !parsedStakeAmount ||
              parsedStakeAmount <= 0 ||
              parsedStakeAmount > staking.data.balance.data
            }
            onClick={() => staking.actions.executeApprove(stakeAmount, () => setWriting("approve", false))}
            isLoading={isWriting.approve}
            isLoadingText="Approving..."
          >
            Approve
          </Button>
          <Button
            className="action-button"
            disabled={
              isWritingContract ||
              !isConnected ||
              !staking.data.balance.data ||
              !isAllowanceSufficient ||
              !parsedStakeAmount ||
              parsedStakeAmount <= 0 ||
              parsedStakeAmount > staking.data.balance.data
            }
            onClick={() => staking.actions.executeStake(stakeAmount, () => setWriting("stake", false))}
            isLoading={isWriting.stake}
            isLoadingText="Staking..."
          >
            Stake
          </Button>
        </div>
        <div className="column-container">
          <div className="max-amount">
            Max:{" "}
            <span onClick={() => setUnstakeAmount(safeFormatUnits(staking.data.userInfo.data?.amount, lpTokenInfo.data.decimals))}>
              {staking.data.userInfo.data ? safeFormatUnits(staking.data.userInfo.data.amount, lpTokenInfo.data.decimals) : "-"} {lpTokenInfo.data.symbol}
            </span>
          </div>
          <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
          <Button
            className="action-button"
            disabled={
              isWritingContract ||
              !isConnected ||
              !staking.data.userInfo.data ||
              !staking.data.balance.data ||
              !parsedUnstakeAmount ||
              parsedUnstakeAmount <= 0 ||
              parsedUnstakeAmount > staking.data.userInfo.data.amount
            }
            onClick={() => staking.actions.executeUnstake(unstakeAmount, () => setWriting("unstake", false))}
            isLoading={isWriting.unstake}
            isLoadingText="Unstaking..."
          >
            Unstake
          </Button>
        </div>
      </div>

      <div>
        <div>
          Pending Rewards:{" "}
          {staking.data.pendingRewards.data !== undefined
            ? Number(safeFormatUnits(staking.data.pendingRewards.data, rewardTokenInfo.data.decimals)).toFixed(2)
            : "-"}{" "}
          {rewardTokenInfo.data.symbol}
        </div>
        <div>
          Reward Per Day: {userRewardPerDay !== null ? userRewardPerDay.toFixed(2) : "-"} {rewardTokenInfo.data?.symbol}
        </div>
        <Button
          className="action-button"
          onClick={() => staking.actions.executeClaim(() => setWriting("claim", false))}
          isLoading={isWriting.claim}
          isLoadingText="Claiming rewards..."
          disabled={isWritingContract || !isConnected || !staking.data.pendingRewards.data}
        >
          Claim Rewards
        </Button>
      </div>
    </div>
  );
}
