import { useEffect} from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { supportedChains } from "../wallet/config";
import { ICONS } from "./iconography";
import { formatWalletAddress, getChainName } from "../utils";
import { useStatusMessage } from "../context/status-message";
import { Button } from "./button";

const useWalletStateCleanup = () => {
  const { isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { clearMessages } = useStatusMessage();

  useEffect(() => {
    clearMessages();
  }, [isConnected, chainId, clearMessages]);
};

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  useWalletStateCleanup();

  const buttonProps = {
    onClick: open,
    className: `wallet-button ${isConnected ? "wallet-button--connected" : ""}`,
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connect-container">
        <Button {...buttonProps} id="disconnect" title="Click to manage wallet">
          {ICONS.DISCONNECT}
          <span>
            {formatWalletAddress(address)} ({getChainName(chainId, supportedChains)})
          </span>
        </Button>
      </div>
    );
  }

  const isConnecting = status === "connecting";

  return (
    <Button {...buttonProps} disabled={isConnecting} title={isConnecting ? "Connecting to wallet..." : "Connect your wallet"}>
      {ICONS.CONNECT}
      <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
    </Button>
  );
}
