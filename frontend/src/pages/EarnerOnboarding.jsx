import React, { useState } from 'react';
import { User, Target, Percent, Calendar, Shield, ArrowRight, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { createISA } from '../lib/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STEPS = ['Profile', 'ISA Terms', 'Review & Submit'];

export default function EarnerOnboarding({ walletAddress, onNavigate, onIsaCreated }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  // Profile fields
  const [profile, setProfile] = useState({
    name: '',
    college: '',
    skills: '',
    bio: '',
  });

  // ISA term fields
  const [terms, setTerms] = useState({
    fundingTarget: '',
    incomeShare: '5',
    durationMonths: '24',
    capMultiplier: '1.5',
  });

  // Derived values
  const capAmount = terms.fundingTarget
    ? (parseFloat(terms.fundingTarget) * parseFloat(terms.capMultiplier)).toFixed(0)
    : '—';
  const monthlyEst = terms.fundingTarget
    ? ((parseFloat(terms.fundingTarget) * parseFloat(terms.incomeShare)) / 100).toFixed(2)
    : '—';

  const canAdvanceProfile = profile.name && profile.skills && profile.bio;
  const canAdvanceTerms =
    terms.fundingTarget > 0 &&
    terms.incomeShare > 0 &&
    terms.incomeShare <= 50 &&
    terms.durationMonths > 0;

  // ── Save profile to backend ────────────────────────────────────────
  const saveProfile = async () => {
    if (!walletAddress) {
      setError('Connect your Freighter wallet first.');
      return;
    }
    try {
      await fetch(`${API_BASE}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, ...profile }),
      });
    } catch (_) {
      // Non-blocking — ISA can still proceed
    }
  };

  // ── Submit ISA on-chain + persist metadata ─────────────────────────
  const handleSubmit = async () => {
    if (!walletAddress) {
      setError('Wallet not connected. Please connect Freighter first.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Convert to basis points
      const incomeShareBp = Math.round(parseFloat(terms.incomeShare) * 100);       // 5% → 500
      const capBp = Math.round(parseFloat(terms.capMultiplier) * 10000);            // 1.5x → 15000

      const { hash } = await createISA({
        earner: walletAddress,
        fundingTarget: Math.round(parseFloat(terms.fundingTarget) * 1e7), // stroops-like unit
        incomeShareBp,
        durationMonths: parseInt(terms.durationMonths),
        capMultiplierBp: capBp,
      });

      setTxHash(hash);

      // Persist off-chain metadata
      const isaPayload = {
        id: Date.now(),            // Placeholder; real ID comes from contract event
        earner: walletAddress,
        fundingTarget: parseFloat(terms.fundingTarget),
        incomeShare: parseFloat(terms.incomeShare),
        duration: parseInt(terms.durationMonths),
        cap: parseFloat(terms.capMultiplier),
        txHash: hash,
        status: 'Funding',
        metadata: { ...profile },
      };

      await fetch(`${API_BASE}/api/isas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isaPayload),
      });

      onIsaCreated?.(isaPayload);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Transaction failed. Check your wallet and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────
  if (txHash) {
    return (
      <div className="page-container">
        <div className="success-card glass-card text-center">
          <div className="success-icon-wrap">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mt-4 mb-2">ISA Proposal Submitted!</h2>
          <p className="text-text-secondary text-sm mb-4">
            Your income-share agreement is now live on Stellar Testnet. Investors can begin funding immediately.
          </p>
          <div className="tx-hash-box">
            <span className="text-xs text-text-muted">Transaction Hash</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-purple-400 underline break-all"
            >
              {txHash}
            </a>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="btn-primary flex-1" onClick={() => onNavigate('investor')}>
              View Open Pools
            </button>
            <button className="btn-secondary flex-1" onClick={() => onNavigate('repay')}>
              Submit Repayment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="onboarding-header">
        <h1 className="page-title">Get Funded</h1>
        <p className="page-sub">Propose an Income-Share Agreement in 3 steps. No collateral. No fixed interest.</p>
      </div>

      {/* Wallet guard */}
      {!walletAddress && (
        <div className="alert-banner alert-warning">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Connect your Freighter wallet to create an ISA proposal.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`step-pill ${i === step ? 'step-pill-active' : i < step ? 'step-pill-done' : 'step-pill-idle'}`}
            >
              {i < step ? '✓' : i + 1} {s}
            </div>
            {i < STEPS.length - 1 && <div className={`step-connector ${i < step ? 'step-connector-done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Profile ────────────────────────────────── */}
      {step === 0 && (
        <div className="glass-card form-card">
          <h2 className="form-section-title flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" /> Your Profile
          </h2>
          <p className="form-section-desc">Investors will see this. Be authentic — it builds trust.</p>

          <div className="form-grid">
            <div className="form-field">
              <label>Full Name / Alias</label>
              <input
                type="text"
                placeholder="e.g. Alex Rivera"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>School / Organization</label>
              <input
                type="text"
                placeholder="e.g. MIT, Self-taught, Upwork"
                value={profile.college}
                onChange={(e) => setProfile({ ...profile, college: e.target.value })}
              />
            </div>
            <div className="form-field form-field-full">
              <label>Skills & Focus Area</label>
              <input
                type="text"
                placeholder="e.g. Web3 dev, UI/UX, Rust, Data Science"
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              />
            </div>
            <div className="form-field form-field-full">
              <label>Bio / Pitch (2–3 sentences)</label>
              <textarea
                rows={3}
                placeholder="Why do you need this funding? What will you build or learn?"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
          </div>

          <button
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            onClick={async () => { await saveProfile(); setStep(1); }}
            disabled={!canAdvanceProfile}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 1: ISA Terms ─────────────────────────────── */}
      {step === 1 && (
        <div className="glass-card form-card">
          <h2 className="form-section-title flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" /> ISA Terms
          </h2>
          <p className="form-section-desc">
            These terms are enforced immutably on-chain. Choose responsibly.
          </p>

          <div className="form-grid">
            <div className="form-field">
              <label>Funding Target (USDC)</label>
              <div className="input-suffix-wrap">
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  min="100"
                  value={terms.fundingTarget}
                  onChange={(e) => setTerms({ ...terms, fundingTarget: e.target.value })}
                />
                <span className="input-suffix">USDC</span>
              </div>
            </div>

            <div className="form-field">
              <label>Income Share Pledged (%)</label>
              <div className="input-suffix-wrap">
                <input
                  type="number"
                  placeholder="e.g. 5"
                  min="1"
                  max="50"
                  step="0.5"
                  value={terms.incomeShare}
                  onChange={(e) => setTerms({ ...terms, incomeShare: e.target.value })}
                />
                <span className="input-suffix">%</span>
              </div>
              <span className="form-hint">Typical range: 3–10%</span>
            </div>

            <div className="form-field">
              <label>Repayment Duration</label>
              <div className="input-suffix-wrap">
                <input
                  type="number"
                  placeholder="e.g. 24"
                  min="3"
                  max="60"
                  value={terms.durationMonths}
                  onChange={(e) => setTerms({ ...terms, durationMonths: e.target.value })}
                />
                <span className="input-suffix">months</span>
              </div>
            </div>

            <div className="form-field">
              <label>Repayment Cap</label>
              <select
                value={terms.capMultiplier}
                onChange={(e) => setTerms({ ...terms, capMultiplier: e.target.value })}
              >
                <option value="1.2">1.2x — Conservative</option>
                <option value="1.5">1.5x — Standard</option>
                <option value="2.0">2.0x — Investor-friendly</option>
              </select>
              <span className="form-hint">You'll repay at most {capAmount} USDC total</span>
            </div>
          </div>

          {/* Live preview */}
          {terms.fundingTarget && (
            <div className="isa-preview glass-card">
              <h4 className="preview-title">
                <Percent className="w-4 h-4" /> ISA Preview
              </h4>
              <div className="preview-row">
                <span>Request</span><strong>${parseFloat(terms.fundingTarget).toLocaleString()} USDC</strong>
              </div>
              <div className="preview-row">
                <span>Income Pledged</span><strong>{terms.incomeShare}% / month</strong>
              </div>
              <div className="preview-row">
                <span>Duration</span><strong>{terms.durationMonths} months</strong>
              </div>
              <div className="preview-row border-t border-white/10 pt-2 mt-1">
                <span>Max Repayment</span>
                <strong className="text-purple-400">${capAmount} USDC</strong>
              </div>
              <div className="preview-row">
                <span className="text-text-muted text-xs">If you earn $2,000/mo:</span>
                <span className="text-xs text-emerald-400">${((2000 * parseFloat(terms.incomeShare || 0)) / 100).toFixed(2)} / month</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button className="btn-secondary flex-1" onClick={() => setStep(0)}>← Back</button>
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={() => setStep(2)}
              disabled={!canAdvanceTerms}
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review & Submit ───────────────────────── */}
      {step === 2 && (
        <div className="glass-card form-card">
          <h2 className="form-section-title flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" /> Review & Submit On-Chain
          </h2>
          <p className="form-section-desc">
            Submitting will sign a Soroban transaction via Freighter. This is irreversible.
          </p>

          <div className="review-grid">
            <div className="review-section">
              <h4 className="review-label">Profile</h4>
              <p className="review-value">{profile.name} · {profile.college || 'Independent'}</p>
              <p className="review-value text-text-muted">{profile.bio}</p>
            </div>
            <div className="review-section">
              <h4 className="review-label">ISA Terms</h4>
              <div className="preview-row"><span>Target</span><strong>${parseFloat(terms.fundingTarget).toLocaleString()} USDC</strong></div>
              <div className="preview-row"><span>Income Share</span><strong>{terms.incomeShare}%</strong></div>
              <div className="preview-row"><span>Duration</span><strong>{terms.durationMonths} months</strong></div>
              <div className="preview-row"><span>Max Repayment</span><strong className="text-purple-400">${capAmount} USDC</strong></div>
            </div>
          </div>

          {error && (
            <div className="alert-banner alert-error mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button className="btn-secondary flex-1" onClick={() => setStep(1)} disabled={loading}>
              ← Edit
            </button>
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={loading || !walletAddress}
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Signing with Freighter…</>
              ) : (
                <><Calendar className="w-4 h-4" /> Submit ISA On-Chain</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
