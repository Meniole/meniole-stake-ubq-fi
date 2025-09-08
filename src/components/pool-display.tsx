import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import erc20Abi from "../abis/erc20.ts";
import { stakingContract } from "../constants/contracts.ts";
import { formatUnits, parseUnits } from "viem";
import { useErc20Token } from "../hooks/erc20Token.ts";
import { useState } from "react";

export function PoolDisplay({ poolId = 0n }: { poolId?: bigint }) {
  const account = useAccount();
  const { writeContract } = useWriteContract();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

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

  const claim = () =>
    writeContract({
      ...stakingContract,
      functionName: "unstake",
      args: [poolId, 0n],
    });

  const stake = (amount: bigint) =>
    writeContract({
      ...stakingContract,
      functionName: "stake",
      args: [poolId, amount],
    });

  const unstake = (amount: bigint) =>
    writeContract({
      ...stakingContract,
      functionName: "unstake",
      args: [poolId, amount],
    });

  const approveAllowance = (amount: bigint) => {
    if (!lpTokenAddress) return;
    writeContract({
      abi: erc20Abi,
      address: lpTokenAddress,
      functionName: "approve",
      args: [stakingContract.address, amount],
    });
  };

  const isAllowanceSufficient =
    lpTokenInfo.data !== null && allowance.data !== undefined ? allowance.data >= parseUnits(stakeAmount, lpTokenInfo.data.decimals) : false;

  return (
    <div>
      <div className="permits-list">
        {/* Headerless table design - cells are self-explanatory (Amount | Source | Actions) */}
        <div>{lpTokenInfo.data?.name} pool</div>
        <div className="permits-body">
          Total staked in pool: {formatUnits(poolInfo.data?.amount ?? 0n, lpTokenInfo.data?.decimals ?? 18)} {lpTokenInfo.data?.symbol}
        </div>
        <div className="permits-body">
          Your Stake: {formatUnits(userInfoData?.result?.amount ?? 0n, lpTokenInfo.data?.decimals ?? 18)} {lpTokenInfo.data?.symbol}
        </div>

        <input type="text" placeholder="Amount" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} />
        <button disabled={!account.isConnected}>Unstake</button>

        <input type="text" placeholder="Amount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
        <button disabled={!account.isConnected || isAllowanceSufficient}>Approve</button>
        <button disabled={!account.isConnected || !isAllowanceSufficient}>Stake</button>

        <div>
          Pending Rewards: {formatUnits(pendingRewardsData?.result ?? 0n, rewardTokenInfo.data?.decimals ?? 18)} {rewardTokenInfo.data?.symbol}
        </div>
        <button onClick={claim} disabled={!account.isConnected || (pendingRewardsData?.result ?? 0n) === 0n}>
          Claim
        </button>
      </div>
    </div>
  );
}
