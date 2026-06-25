import React, { useState, useEffect } from 'react';
import { Wallet, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { analytics } from '../lib/analytics';

/**
 * WalletConnect supports both @stellar/freighter-api v1 (isConnected/getPublicKey)
 * and v2 (isAllowed / requestAccess). We detect which API is available at runtime.
 */
export default function WalletConnect({ onConnect, address }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletInstalled, setWalletInstalled] = useState(null); // null = checking

  useEffect(() => {
    (async () => {
      try {
        // Works for both v1 and v2
        const { isConnected } = await import('@stellar/freighter-api');
        const connected = await isConnected();
        // v1 returns boolean; v2 returns { isConnected: boolean }
        const result = typeof connected === 'object' ? connected.isConnected : connected;
        setWalletInstalled(result !== undefined);
      } catch {
        setWalletInstalled(false);
      }
    })();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const freighter = await import('@stellar/freighter-api');

      // Freighter v2 API
      if (typeof freighter.requestAccess === 'function') {
        const { address: addr, error: err } = await freighter.requestAccess();
        if (err) throw new Error(err);
        if (!addr) throw new Error('Connection rejected by user.');
        onConnect(addr);
        analytics.identify(addr);
        return;
      }

      // Freighter v1 API fallback
      if (typeof freighter.getPublicKey === 'function') {
        const publicKey = await freighter.getPublicKey();
        if (!publicKey) throw new Error('User rejected connection request.');
        onConnect(publicKey);
        analytics.identify(publicKey);
        return;
      }

      throw new Error('Freighter API unavailable. Make sure the extension is installed.');
    } catch (err) {
      console.error('[WalletConnect]', err);
      setError(err.message || 'Failed to connect to Freighter wallet.');
    } finally {
      setLoading(false);
    }
  };

  const truncate = (addr) => `${addr.substring(0, 6)}…${addr.substring(addr.length - 4)}`;

  return (
    <div className="wallet-connect-container">
      {address ? (
        <div
          className="flex items-center gap-2 px-4 py-2 border rounded-full bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
          title={address}
          aria-label={`Wallet connected: ${address}`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-sm font-semibold">{truncate(address)}</span>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={connectWallet}
            disabled={loading || walletInstalled === false}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold btn-primary text-sm"
            aria-label="Connect Freighter wallet"
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
            ) : (
              <><Wallet className="w-4 h-4" /> Connect Wallet</>
            )}
          </button>

          {walletInstalled === false && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-500/30 px-3 py-1.5 rounded-md">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                Freighter not detected.{' '}
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Install it
                </a>
                {' '}to continue.
              </span>
            </div>
          )}

          {error && walletInstalled !== false && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-500/30 px-3 py-1.5 rounded-md max-w-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
