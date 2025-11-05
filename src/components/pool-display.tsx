import { useAppKitAccount } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { stakingContract } from "../constants/contracts";
import { useErc20Token } from "../hooks/erc20Token";
import { useState } from "react";
import { Button } from "./button";
import { useStaking } from "../hooks/useStaking";
import { safeFormatUnits, safeParseUnits, calculatePoolRewardPerDay, calculateUserPoolShare, calculateUserRewardPerDay } from "../utils/pool";
import type { Address } from "viem";
import { z } from "zod";

const TokenInfoSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
});

const PoolInfoSchema = z.object({
  lpToken: z.custom<Address>(),
  amount: z.bigint(),
  allocationPoints: z.bigint(),
});

const StakingSettingsSchema = z.tuple([z.custom<Address>(), z.any(), z.any(), z.bigint(), z.any(), z.any(), z.bigint()]);

const UserInfoSchema = z.object({
  amount: z.bigint(),
});

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

  const validatedStakingSettings = StakingSettingsSchema.safeParse(stakingSettings.data);
  const validatedLpTokenInfo = TokenInfoSchema.safeParse(lpTokenInfo.data);
  const validatedRewardTokenInfo = TokenInfoSchema.safeParse(rewardTokenInfo.data);
  const validatedPoolInfo = PoolInfoSchema.safeParse(poolInfo.data);
  const validatedUserInfo = UserInfoSchema.safeParse(staking.data.userInfo.data);

  const isLoading =
    !validatedStakingSettings.success ||
    !validatedLpTokenInfo.success ||
    !validatedRewardTokenInfo.success ||
    !validatedPoolInfo.success ||
    (isConnected && !validatedUserInfo.success);

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

  const lpToken = validatedLpTokenInfo.data;
  const rewardToken = validatedRewardTokenInfo.data;
  const pool = validatedPoolInfo.data;
  const settings = validatedStakingSettings.data;
  const userInfo = validatedUserInfo.success ? validatedUserInfo.data : { amount: 0n };

  const parsedStakeAmount = safeParseUnits(stakeAmount, lpToken.decimals);
  const parsedUnstakeAmount = safeParseUnits(unstakeAmount, lpToken.decimals);
  const isAllowanceSufficient = staking.data.allowance.data !== undefined && parsedStakeAmount ? staking.data.allowance.data >= parsedStakeAmount : false;

  const poolRewardPerDay = calculatePoolRewardPerDay(settings[3], pool.allocationPoints, settings[6], rewardToken.decimals);

  const userPoolShare = pool.amount > 0n ? calculateUserPoolShare(userInfo.amount, pool.amount, lpToken.decimals) : null;

  const userRewardPerDay = calculateUserRewardPerDay(userPoolShare, poolRewardPerDay);
  const isWritingContract = Object.values(isWriting).some(Boolean);

  const setWriting = (key: keyof typeof isWriting, value: boolean) => setIsWriting((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="pool-container">
      <div className="pool-title">{lpToken.name} Pool</div>
      <div>
        Total Staked: {safeFormatUnits(pool.amount, lpToken.decimals)} {lpToken.symbol}
      </div>
      <div>
        Your Stake: {safeFormatUnits(userInfo.amount, lpToken.decimals)} {lpToken.symbol}{" "}
        {userPoolShare && userPoolShare > 0.0001 ? `(${(userPoolShare * 100).toFixed(2)}% of pool)` : ""}
      </div>

      <div className="stake-row-container">
        <div className="column-container">
          <div className="max-amount">
            Max:{" "}
            <span onClick={() => setStakeAmount(safeFormatUnits(userInfo.amount, lpToken.decimals))}>
              {safeFormatUnits(userInfo.amount, lpToken.decimals)} {lpToken.symbol}
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
            <span onClick={() => setUnstakeAmount(safeFormatUnits(userInfo.amount, lpToken.decimals))}>
              {safeFormatUnits(userInfo.amount, lpToken.decimals)} {lpToken.symbol}
            </span>
          </div>
          <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
          <Button
            className="action-button"
            disabled={
              isWritingContract ||
              !isConnected ||
              !staking.data.balance.data ||
              !parsedUnstakeAmount ||
              parsedUnstakeAmount <= 0 ||
              parsedUnstakeAmount > userInfo.amount
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
          {staking.data.pendingRewards.data !== undefined ? Number(safeFormatUnits(staking.data.pendingRewards.data, rewardToken.decimals)).toFixed(2) : "-"}{" "}
          {rewardToken.symbol}
        </div>
        <div>
          Reward Per Day: {userRewardPerDay !== null ? userRewardPerDay.toFixed(2) : "-"} {rewardToken.symbol}
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
