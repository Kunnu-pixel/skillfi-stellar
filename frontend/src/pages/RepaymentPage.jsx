import React, { useState } from 'react';
import RepaymentForm from '../components/RepaymentForm';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { distributeRepayment } from '../lib/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RepaymentPage({ walletAddress, isas, onRepaySubmit }) {
  const [selectedIsaId, setSelectedIsaId] = useState('');

  // Filter to ISAs where the connected wallet is the earner
  const myIsas = walletAddress
    ? isas.filter((isa) => isa.earner === walletAddress)
    : [];

  const selectedIsa = myIsas.find((isa) => String(isa.id) === String(selectedIsaId)) || null;

  const handleRepaySubmit = async (isaId, amount, proofUrl) => {
    if (!walletAddress) throw new Error('Wallet not connected.');

    // Upload proof to backend
    await fetch(`${API_BASE}/api/proofs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isaId, income: amount, docUrl: proofUrl }),
    }).catch(() => {});

    // On-chain repayment distribution
    // The investor list should come from the pool — for MVP we pass known investors
    // In production this would be fetched from the indexer
    const investorRes = await fetch(`${API_BASE}/api/investors/${isaId}`).catch(() => null);
    const investors = investorRes?.ok ? await investorRes.json() : [];

    await distributeRepayment({
      distributorContractId: selectedIsa?.distributorContractId || null,
      payer: walletAddress,
      amount: Math.round(amount * 1e7),
      investors: investors.map((inv) => inv.address),
    });

    // Record repayment in backend
    await fetch(`${API_BASE}/api/repayments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isaId, amount, payer: walletAddress, proofUrl }),
    }).catch(() => {});

    await onRepaySubmit?.(isaId, amount, proofUrl);
  };

  if (!walletAddress) {
    return (
      <div className="page-container">
        <div className="alert-banner alert-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Connect your Freighter wallet to submit a repayment.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="onboarding-header">
        <h1 className="page-title">Submit Repayment</h1>
        <p className="page-sub">
          Log your monthly earnings and pay your income share. Funds distribute automatically to your investors.
        </p>
      </div>

      {/* ISA selector */}
      <div className="glass-card form-card mb-6">
        <label className="form-field">
          <span className="form-label">Select your ISA</span>
          <div className="select-wrap">
            <select
              value={selectedIsaId}
              onChange={(e) => setSelectedIsaId(e.target.value)}
              disabled={myIsas.length === 0}
            >
              <option value="">— Choose an ISA —</option>
              {myIsas.map((isa) => (
                <option key={isa.id} value={isa.id}>
                  ISA #{isa.id} · {isa.metadata?.name || isa.earner.substring(0, 10)} · {isa.incomeShare}% share
                </option>
              ))}
            </select>
            <ChevronDown className="select-chevron w-4 h-4" />
          </div>

          {myIsas.length === 0 && (
            <p className="form-hint text-yellow-400">
              No ISAs found for your wallet. Create one first in the "Get Funded" section.
            </p>
          )}
        </label>
      </div>

      {selectedIsa && (
        <RepaymentForm isa={selectedIsa} onRepaySubmit={handleRepaySubmit} />
      )}

      {/* Repayment history could be fetched here in future iterations */}
    </div>
  );
}
