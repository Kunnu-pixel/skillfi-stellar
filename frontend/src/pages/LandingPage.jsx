import React from 'react';
import { ArrowRight, Shield, Zap, TrendingUp, Users, Globe, ChevronDown } from 'lucide-react';
import WalletConnect from '../components/WalletConnect';

const FEATURES = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Income Capped, Not Fixed',
    desc: 'Repayment auto-stops at 1.5x funding — no compounding interest traps.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Stellar Speed',
    desc: '5-second settlement on Stellar testnet. Sub-cent transaction fees.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Transparent Yield',
    desc: 'Investors earn proportional returns auto-distributed on-chain.',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Global & Non-Custodial',
    desc: 'Any earner, any investor, anywhere — via Freighter wallet.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', label: 'Earner proposes', desc: 'Set funding target, income share %, and repayment cap.' },
  { step: '02', label: 'Investors fund', desc: 'Deposit USDC and receive proportional claim tokens.' },
  { step: '03', label: 'Earner earns', desc: 'Monthly repayments split automatically to all investors.' },
  { step: '04', label: 'Cap reached', desc: 'Smart contract stops repayments. ISA closes on-chain.' },
];

export default function LandingPage({ onNavigate, onWalletConnect, walletAddress, stats }) {
  return (
    <div className="landing">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-badge">
          <Zap className="w-3.5 h-3.5" />
          Built on Stellar Soroban Testnet
        </div>
        <h1 className="hero-heading">
          Fund Your Future,<br />
          <span className="gradient-text">Not Your Debt</span>
        </h1>
        <p className="hero-sub">
          SkillFi is a decentralized Income-Share Agreement platform. Earners raise
          upfront capital from global investors and repay a small % of their income —
          never more than the cap.
        </p>
        <div className="hero-cta">
          {walletAddress ? (
            <>
              <button className="btn-primary hero-btn" onClick={() => onNavigate('earner')}>
                Get Funded <ArrowRight className="w-4 h-4" />
              </button>
              <button className="btn-secondary hero-btn" onClick={() => onNavigate('investor')}>
                Start Investing
              </button>
            </>
          ) : (
            <>
              <WalletConnect onConnect={onWalletConnect} address={walletAddress} />
              <button className="btn-secondary hero-btn" onClick={() => onNavigate('explorer')}>
                View Explorer
              </button>
            </>
          )}
        </div>

        {/* Live stats strip */}
        <div className="stats-strip">
          <div className="stat-item">
            <span className="stat-value gradient-text">${(stats.totalFunded || 0).toLocaleString()}</span>
            <span className="stat-label">Total Funded</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value text-emerald-400">{stats.activeIsas || 0}</span>
            <span className="stat-label">Active ISAs</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value text-purple-400">${(stats.totalRepaid || 0).toLocaleString()}</span>
            <span className="stat-label">Repaid to Investors</span>
          </div>
        </div>

        <a href="#how" className="scroll-hint" aria-label="Scroll down">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how" className="section-padded">
        <h2 className="section-heading">How SkillFi Works</h2>
        <p className="section-sub">Four simple steps — all enforced by immutable Soroban smart contracts.</p>
        <div className="steps-grid">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="step-card glass-card">
              <span className="step-number gradient-text">{s.step}</span>
              <h3 className="step-title">{s.label}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section-padded section-alt">
        <h2 className="section-heading">Why Stellar?</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card glass-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dual CTA ─────────────────────────────────────────── */}
      <section className="section-padded">
        <div className="dual-cta">
          <div className="cta-card glass-card">
            <Users className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="cta-title">I'm an Earner</h3>
            <p className="cta-desc">
              Student, freelancer, or early-career professional? Propose an ISA and get
              funded without fixed-rate debt.
            </p>
            <button className="btn-primary w-full mt-4" onClick={() => onNavigate('earner')}>
              Create ISA Proposal
            </button>
          </div>
          <div className="cta-card glass-card">
            <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="cta-title">I'm an Investor</h3>
            <p className="cta-desc">
              Deploy capital into income-share pools. Earn transparent, auto-distributed
              yield from real human outcomes.
            </p>
            <button className="btn-secondary w-full mt-4" onClick={() => onNavigate('investor')}>
              Browse Open Pools
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
