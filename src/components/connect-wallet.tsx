import { useEffect, useRef } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { supportedChains } from "../wallet/config";
import { ICONS } from "./iconography";
import { formatWalletAddress, getChainName } from "../utils";
import { useStatusMessage } from "../context/status-message";

const useWalletStateCleanup = (clearMessages: () => void) => {
  const { isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const prevStateRef = useRef({ isConnected, chainId });

  useEffect(() => {
    const hasChanged = prevStateRef.current.isConnected !== isConnected || prevStateRef.current.chainId !== chainId;

    if (hasChanged) {
      clearMessages();
      prevStateRef.current = { isConnected, chainId };
    }
  }, [isConnected, chainId, clearMessages]);
};

interface ConnectedButtonProps {
  address: string;
  chainName: string;
  onClick: () => void;
}

const ConnectedButton = ({ address, chainName, onClick }: ConnectedButtonProps) => (
  <div className="wallet-connect-container">
    <button id="disconnect" onClick={onClick} className="wallet-button wallet-button--connected" title="Click to manage wallet">
      {ICONS.DISCONNECT}
      <span>
        {formatWalletAddress(address)} ({chainName})
      </span>
    </button>
  </div>
);

interface DisconnectedButtonProps {
  status: string;
  onClick: () => void;
}

const DisconnectedButton = ({ status, onClick }: DisconnectedButtonProps) => {
  const isConnecting = status === "connecting";

  return (
    <button className="wallet-button" disabled={isConnecting} onClick={onClick} title={isConnecting ? "Connecting to wallet..." : "Connect your wallet"}>
      {ICONS.CONNECT}
      <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
    </button>
  );
};

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { clearMessages } = useStatusMessage();

  useWalletStateCleanup(clearMessages);

  if (isConnected && address) {
    return <ConnectedButton address={address} chainName={getChainName(chainId, supportedChains)} onClick={() => open()} />;
  }

  return <DisconnectedButton status={status ?? "disconnected"} onClick={() => open()} />;
}
