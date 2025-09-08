import { injected, useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from "wagmi";
import { ICONS } from "./iconography.tsx";
import { useState } from "react";
import { PoolDisplay } from "./pool-display.tsx";

const LogoSpan = () => <span id="header-logo-wrapper">{ICONS.DAO_LOGO}</span>;

export function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { connect, error: connectError, status } = useConnect();
  const { disconnect } = useDisconnect();

  const [dataError, setDataError] = useState<string | null>(null);

  const isWalletInstalled = typeof window !== "undefined" && !!window.ethereum;

  return (
    <>
      {/* Header Section */}
      <section id="header" className="header-logged-in">
        <div id="logo-wrapper">
          <h1>
            <LogoSpan />
            <span>Ubiquity</span>
            <span>Stake</span>
          </h1>
        </div>

        {/* Header Buttons/Controls (Directly under #header) */}
        {isConnected && address ? (
          <>
            <button id="disconnect" onClick={() => disconnect()} className="button-with-icon">
              {ICONS.DISCONNECT}
              <span>{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</span>
            </button>
          </>
        ) : (
          <button
            className="button-with-icon"
            disabled={!isWalletInstalled || status === "pending"}
            onClick={() => connect({ connector: injected() })}
          >
            {!isWalletInstalled ? ICONS.WARNING : ICONS.CONNECT}
            <span>{status === "pending" ? "Connecting..." : !isWalletInstalled ? "Requires Wallet Extension" : "Connect Wallet"}</span>
          </button>
        )}
      </section>

      <PoolDisplay />

      {/* Error Displays */}
      {dataError && (
        <section id="error-message-wrapper">
          <div className="error-message">
            {ICONS.WARNING}
            <span>{dataError}</span>
          </div>
        </section>
      )}
    </>
  );
}
