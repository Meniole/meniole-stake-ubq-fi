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
  name: z.string().min(1),
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(18),
});

const PoolInfoSchema = z.object({
  lpToken: z.custom<Address>(),
  amount: z.bigint(),
  allocationPoints: z.bigint(),
});

const StakingSettingsSchema = z.tuple([z.custom<Address>(), z.bigint(), z.bigint(), z.bigint(), z.bigint(), z.bigint(), z.bigint(), z.bigint()]);

const UserInfoSchema = z.object({
  amount: z.bigint(),
});

interface PoolDisplayProps {
  poolId?: bigint;
}

const WRITE_ACTION = {
  APPROVE: "approve",
  STAKE: "stake",
  UNSTAKE: "unstake",
  CLAIM: "claim",
  NONE: "none",
} as const;

type WriteAction = (typeof WRITE_ACTION)[keyof typeof WRITE_ACTION];

export function PoolDisplay({ poolId = 0n }: PoolDisplayProps) {
  const { address, isConnected } = useAppKitAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [currentWriteAction, setCurrentWriteAction] = useState<WriteAction>(WRITE_ACTION.NONE);

  const stakingSettings = useReadContract({
    ...stakingContract,
    functionName: "getStakingSettings",
    args: [],
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });

  const poolInfo = useReadContract({
    ...stakingContract,
    functionName: "getStakingPoolInfo",
    args: [poolId],
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });

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

  const publicDataErrors = [
    stakingSettings.error && stakingSettings.fetchStatus === 'idle',
    lpTokenInfo.error && lpTokenInfo.fetchStatus === 'idle',
    rewardTokenInfo.error && rewardTokenInfo.fetchStatus === 'idle',
    poolInfo.error && poolInfo.fetchStatus === 'idle',
  ];

  const hasRealError = publicDataErrors.some(err => err);

  const isLoadingPublicData =
    stakingSettings.isLoading ||
    lpTokenInfo.isLoading ||
    rewardTokenInfo.isLoading ||
    poolInfo.isLoading;

  const isLoadingUserData = isConnected &&
    Object.values(staking.data).some((d) => d.isLoading);

  const isLoadingInitialData = isLoadingPublicData || isLoadingUserData;

  if (isLoadingInitialData) {
    return (
      <div className="pool-container">
        <div className="loading-container">
          <div className="spinner button-spinner"></div>
          <span>Loading pool information...</span>
        </div>
      </div>
    );
  }

  const validatedStakingSettings = StakingSettingsSchema.safeParse(stakingSettings.data);
  const validatedLpTokenInfo = TokenInfoSchema.safeParse(lpTokenInfo.data);
  const validatedRewardTokenInfo = TokenInfoSchema.safeParse(rewardTokenInfo.data);
  const validatedPoolInfo = PoolInfoSchema.safeParse(poolInfo.data);

  const publicDataValidationError =
    !validatedStakingSettings.success ||
    !validatedLpTokenInfo.success ||
    !validatedRewardTokenInfo.success ||
    !validatedPoolInfo.success;

  let validatedUserInfo;

  if (isConnected && staking.data.userInfo.data !== undefined) {
    validatedUserInfo = UserInfoSchema.safeParse(staking.data.userInfo.data);
  } else {
    validatedUserInfo = {
      success: true,
      data: { amount: 0n }
    };
  }

  if (hasRealError || publicDataValidationError) {
    return (
      <div className="pool-container">
        <div style={{ padding: "20px", color: "#ff6666" }}>
          <h3 style={{ marginTop: 0 }}>Error Loading Pool Data</h3>
          {hasRealError && <p>Failed to load pool information. Please try again later.</p>}
          {publicDataValidationError && (
            <div>
              <p>Data validation failed:</p>
              <ul style={{ textAlign: 'left', fontSize: '14px', lineHeight: '1.6' }}>
                {!validatedStakingSettings.success && <li>Staking Settings</li>}
                {!validatedLpTokenInfo.success && <li>LP Token Info</li>}
                {!validatedRewardTokenInfo.success && <li>Reward Token Info</li>}
                {!validatedPoolInfo.success && <li>Pool Info</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const lpToken = validatedLpTokenInfo.data;
  const rewardToken = validatedRewardTokenInfo.data;
  const pool = validatedPoolInfo.data;
  const settings = validatedStakingSettings.data;
  const userInfo = validatedUserInfo.data;

  const parsedStakeAmount = safeParseUnits(stakeAmount, lpToken.decimals);
  const parsedUnstakeAmount = safeParseUnits(unstakeAmount, lpToken.decimals);

  const isAllowanceSufficient = staking.data.allowance.data !== undefined && parsedStakeAmount ? staking.data.allowance.data >= parsedStakeAmount : false;

  const poolRewardPerDay = calculatePoolRewardPerDay(settings[3], pool.allocationPoints, settings[6], rewardToken.decimals);
  const userPoolShare = pool.amount > 0n ? calculateUserPoolShare(userInfo.amount, pool.amount, lpToken.decimals) : null;
  const userRewardPerDay = calculateUserRewardPerDay(userPoolShare, poolRewardPerDay);
  const isWritingContract = currentWriteAction !== WRITE_ACTION.NONE;

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
            <span className="clickable-amount" onClick={() => setStakeAmount(safeFormatUnits(staking.data.balance.data ?? 0n, lpToken.decimals))}>
              {safeFormatUnits(staking.data.balance.data ?? 0n, lpToken.decimals)} {lpToken.symbol}
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
            onClick={async () => {
              setCurrentWriteAction(WRITE_ACTION.APPROVE);
              try {
                await staking.actions.executeApprove(stakeAmount);
              } finally {
                setCurrentWriteAction(WRITE_ACTION.NONE);
              }
            }}
            isLoading={currentWriteAction === WRITE_ACTION.APPROVE}
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
            onClick={async () => {
              setCurrentWriteAction(WRITE_ACTION.STAKE);
              try {
                await staking.actions.executeStake(stakeAmount);
              } finally {
                setCurrentWriteAction(WRITE_ACTION.NONE);
              }
            }}
            isLoading={currentWriteAction === WRITE_ACTION.STAKE}
            isLoadingText="Staking..."
          >
            Stake
          </Button>
        </div>

        <div className="column-container">
          <div className="max-amount">
            Max:{" "}
            <span className="clickable-amount" onClick={() => setUnstakeAmount(safeFormatUnits(userInfo.amount, lpToken.decimals))}>
              {safeFormatUnits(userInfo.amount, lpToken.decimals)} {lpToken.symbol}
            </span>
          </div>
          <input type="text" pattern="\d*\.?\d*" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
          <Button
            className="action-button"
            disabled={isWritingContract || !isConnected || !parsedUnstakeAmount || parsedUnstakeAmount <= 0 || parsedUnstakeAmount > userInfo.amount}
            onClick={async () => {
              setCurrentWriteAction(WRITE_ACTION.UNSTAKE);
              try {
                await staking.actions.executeUnstake(unstakeAmount);
              } finally {
                setCurrentWriteAction(WRITE_ACTION.NONE);
              }
            }}
            isLoading={currentWriteAction === WRITE_ACTION.UNSTAKE}
            isLoadingText="Unstaking..."
          >
            Unstake
          </Button>
        </div>
      </div>

      <div className="rewards-section">
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
          onClick={async () => {
            setCurrentWriteAction(WRITE_ACTION.CLAIM);
            try {
              await staking.actions.executeClaim();
            } finally {
              setCurrentWriteAction(WRITE_ACTION.NONE);
            }
          }}
          isLoading={currentWriteAction === WRITE_ACTION.CLAIM}
          isLoadingText="Claiming rewards..."
          disabled={isWritingContract || !isConnected || !staking.data.pendingRewards.data || staking.data.pendingRewards.data <= 0n}
        >
          Claim Rewards
        </Button>
      </div>
    </div>
  );
}