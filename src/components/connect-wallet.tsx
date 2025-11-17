import { useEffect } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { supportedChains } from "../wallet/config";
import { ICONS } from "./iconography";
import { formatWalletAddress, getChainName } from "../utils";
import { useStatusMessageActions } from "../context/status-message";
import { Button } from "./button";

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { clearMessages } = useStatusMessageActions();

  useEffect(() => {
    clearMessages();
  }, [isConnected, chainId, clearMessages]);

  const normalizedChainId = typeof chainId === "string" ? parseInt(chainId, 10) : chainId;

  const isConnecting = status === "connecting";

  if (isConnected && address) {
    return (
      <div className="wallet-connect-container">
        <Button onClick={() => open()} className="wallet-button wallet-button--connected" id="disconnect" title="Click to manage wallet">
          {ICONS.DISCONNECT}
          <span>
            {formatWalletAddress(address)} ({getChainName(normalizedChainId, supportedChains)})
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => open()}
      className="wallet-button"
      disabled={isConnecting}
      isLoading={isConnecting}
      isLoadingText="Connecting..."
      title={isConnecting ? "Connecting to wallet..." : "Connect your wallet"}
    >
      {ICONS.CONNECT}
      <span>Connect Wallet</span>
    </Button>
  );
}
