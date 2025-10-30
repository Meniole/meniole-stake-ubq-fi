import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { supportedChains } from "../wallet/config";
import { ICONS } from "./iconography";

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  
  if (isConnected && address) {
    const currentChain = supportedChains.find((c) => c.id === chainId);
    const chainName = currentChain?.name || `Chain ${chainId}`;
    const truncatedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

    return (
      <div className="wallet-connect-container">        
        <button 
          id="disconnect" 
          onClick={() => open()} 
          className="wallet-button wallet-button--connected"
          title="Click to manage wallet"
        >
          {ICONS.DISCONNECT}
          <span>
            {truncatedAddress} ({chainName})
          </span>
        </button>
      </div>
    );
  }

  return (
    <button 
      className="wallet-button" 
      disabled={status === "connecting"} 
      onClick={() => open()}
      title={status === "connecting" ? "Connecting to wallet..." : "Connect your wallet"}
    >
      {ICONS.CONNECT}
      <span>{status === "connecting" ? "Connecting..." : "Connect Wallet"}</span>
    </button>
  );
}