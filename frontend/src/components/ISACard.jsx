import React from 'react';
import { DollarSign, Percent, Calendar, Compass, User } from 'lucide-react';

export default function ISACard({ isa, onInvestClick, isEarner = false }) {
  const {
    id,
    earner,
    fundingTarget,
    raised = 0,
    incomeShare,
    duration,
    cap,
    status,
    metadata = {}
  } = isa;

  const percentRaised = Math.min(100, Math.round((raised / fundingTarget) * 100));

  return (
    <div className="glass-card flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-text-primary">
                {metadata.name || `Earner #${id}`}
              </h4>
              <p className="text-xs text-text-muted">
                {metadata.college || "Freelancer / Scholar"}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            status === 'Funded' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {status}
          </span>
        </div>

        {/* Bio / Description */}
        <p className="text-sm text-text-secondary mb-4 line-clamp-3">
          {metadata.bio || "No biography provided. Earner is seeking capital to fund learning goals and expand skillsets."}
        </p>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" /> Income Share
            </span>
            <span className="text-sm font-semibold">{incomeShare}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Duration
            </span>
            <span className="text-sm font-semibold">{duration} Months</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Repayment Cap
            </span>
            <span className="text-sm font-semibold">{cap}x Target</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Target
            </span>
            <span className="text-sm font-semibold">${fundingTarget} USDC</span>
          </div>
        </div>
      </div>

      {/* Progress & Actions */}
      <div>
        <div className="flex justify-between text-xs text-text-secondary mb-1">
          <span>Raised: ${raised} USDC</span>
          <span className="font-semibold">{percentRaised}%</span>
        </div>
        <div className="progress-container">
          <div className="progress-fill" style={{ width: `${percentRaised}%` }}></div>
        </div>

        {!isEarner && status !== 'Funded' && (
          <button
            onClick={() => onInvestClick(isa)}
            className="w-full mt-4 py-2.5 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
          >
            Invest in {metadata.name || 'Earner'}
          </button>
        )}
        
        {status === 'Funded' && (
          <div className="w-full mt-4 py-2 text-center text-xs font-semibold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
            Generating Yield & Repaying
          </div>
        )}
      </div>
    </div>
  );
}
