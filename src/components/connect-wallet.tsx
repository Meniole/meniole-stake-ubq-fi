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
    if (prevStateRef.current.isConnected !== isConnected || prevStateRef.current.chainId !== chainId) {
      clearMessages();
      prevStateRef.current = { isConnected, chainId };
    }
  }, [isConnected, chainId, clearMessages]);
};

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { clearMessages } = useStatusMessage();

  useWalletStateCleanup(clearMessages);

  const buttonProps = {
    onClick: () => open(),
    className: `wallet-button ${isConnected ? "wallet-button--connected" : ""}`,
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connect-container">
        <button {...buttonProps} id="disconnect" title="Click to manage wallet">
          {ICONS.DISCONNECT}
          <span>
            {formatWalletAddress(address)} ({getChainName(chainId, supportedChains)})
          </span>
        </button>
      </div>
    );
  }

  const isConnecting = status === "connecting";
  return (
    <button {...buttonProps} disabled={isConnecting} title={isConnecting ? "Connecting to wallet..." : "Connect your wallet"}>
      {ICONS.CONNECT}
      <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
    </button>
  );
}
