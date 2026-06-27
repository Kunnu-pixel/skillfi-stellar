import React, { useState, useEffect } from 'react';
import WalletConnect from './WalletConnect';
import { Menu, X, Zap, AlertTriangle, ExternalLink } from 'lucide-react';

const NAV_LINKS = [
  { id: 'landing', label: 'Home' },
  { id: 'earner', label: 'Get Funded' },
  { id: 'investor', label: 'Invest' },
  { id: 'repay', label: 'Repay' },
  { id: 'explorer', label: 'Explorer' },
];

export default function NavBar({ address, currentPage, onNavigate, onWalletConnect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [networkWarning, setNetworkWarning] = useState(false);

  // Check if Freighter is on the wrong network when wallet connects
  useEffect(() => {
    if (!address) {
      setNetworkWarning(false);
      return;
    }
    (async () => {
      try {
        const freighter = await import('@stellar/freighter-api');
        // v2 API: getNetworkDetails; v1: getNetwork
        if (typeof freighter.getNetworkDetails === 'function') {
          const details = await freighter.getNetworkDetails();
          const network = details?.network || details;
          if (typeof network === 'string' && !network.toLowerCase().includes('testnet')) {
            setNetworkWarning(true);
          }
        } else if (typeof freighter.getNetwork === 'function') {
          const net = await freighter.getNetwork();
          if (typeof net === 'string' && !net.toLowerCase().includes('testnet')) {
            setNetworkWarning(true);
          }
        }
      } catch {
        // Silently ignore — network check is non-blocking
      }
    })();
  }, [address]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <button
          onClick={() => onNavigate('landing')}
          className="navbar-logo"
          aria-label="Go to home"
        >
          <div className="logo-icon">
            <Zap className="w-4 h-4" />
          </div>
          <span className="logo-text">SkillFi</span>
        </button>

        {/* Desktop links */}
        <div className="navbar-links">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`nav-link ${currentPage === link.id ? 'nav-link-active' : ''}`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Wallet + network badge + mobile menu toggle */}
        <div className="navbar-actions">
          {/* Testnet network badge — always visible when wallet connected */}
          {address && !networkWarning && (
            <span className="testnet-badge" aria-label="Connected to Stellar Testnet">
              Testnet
            </span>
          )}
          {/* Wrong-network warning */}
          {networkWarning && (
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="network-warning-badge"
              title="Switch Freighter to Testnet"
              aria-label="Wrong network — switch to Testnet"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Switch to Testnet
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <WalletConnect onConnect={onWalletConnect} address={address} />
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Wrong-network full banner (mobile-friendly) */}
      {networkWarning && (
        <div className="network-warning-banner" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Your Freighter wallet is <strong>not on Testnet</strong>. Open Freighter → Settings → Network → select <strong>Testnet</strong>.
            Alternatively, fund a testnet account via the{' '}
            <a
              href="https://laboratory.stellar.org/#account-creator?network=testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
            >
              Friendbot faucet
            </a>.
          </span>
          <button
            onClick={() => setNetworkWarning(false)}
            className="ml-auto text-xs underline shrink-0"
            aria-label="Dismiss network warning"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-nav">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => { onNavigate(link.id); setMenuOpen(false); }}
              className={`mobile-nav-link ${currentPage === link.id ? 'mobile-nav-link-active' : ''}`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
