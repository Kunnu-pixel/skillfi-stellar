import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import InvestmentModal from '../components/InvestmentModal';
import { investInPool } from '../lib/contracts';
import { AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function InvestorDashboard({
  walletAddress,
  isas,
  stats,
  portfolio,
  loadingIsas,
  onNavigate,
  onInvestSubmit,
  onFeedbackSubmit,
}) {
  const [selectedIsa, setSelectedIsa] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const handleInvestClick = (isa) => {
    if (!walletAddress) {
      setError('Connect your Freighter wallet to invest.');
      return;
    }
    setSelectedIsa(isa);
    setModalOpen(true);
    setError(null);
  };

  const handleInvestSubmit = async (isaId, amount) => {
    if (!walletAddress) throw new Error('Wallet not connected.');

    // Call on-chain invest function
    await investInPool({
      poolContractId: selectedIsa?.poolContractId || null,
      investor: walletAddress,
      amount: Math.round(amount * 1e7), // to stroops-like units
    });

    // Record investment in backend
    await fetch(`${API_BASE}/api/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isaId,
        investor: walletAddress,
        amount,
      }),
    }).catch(() => {}); // non-critical

    await onInvestSubmit?.(isaId, amount);
  };

  return (
    <div>
      {error && (
        <div className="alert-banner alert-warning mx-4 mt-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {!walletAddress && (
        <div className="alert-banner alert-info mx-4 mt-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Connect your Freighter wallet to invest in ISA pools.</span>
        </div>
      )}

      <Dashboard
        address={walletAddress}
        isas={isas}
        stats={stats}
        portfolio={portfolio}
        loadingIsas={loadingIsas}
        onInvestClick={handleInvestClick}
        onFeedbackSubmit={onFeedbackSubmit}
        onNavigate={onNavigate}
      />

      {modalOpen && selectedIsa && (
        <InvestmentModal
          isa={selectedIsa}
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedIsa(null); }}
          onInvestSubmit={handleInvestSubmit}
        />
      )}
    </div>
  );
}
