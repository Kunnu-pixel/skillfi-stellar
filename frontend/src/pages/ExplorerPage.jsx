import React, { useState } from 'react';
import { Search, ExternalLink, TrendingUp, Database, Activity, Users } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';

export default function ExplorerPage({ isas, stats, loadingIsas }) {
  const [query, setQuery] = useState('');

  const filtered = isas.filter((isa) => {
    const q = query.toLowerCase();
    return (
      !q ||
      isa.earner?.toLowerCase().includes(q) ||
      isa.metadata?.name?.toLowerCase().includes(q) ||
      String(isa.id).includes(q)
    );
  });

  const statusColor = (status) => {
    switch (status) {
      case 'Funded': return 'badge-green';
      case 'Funding': return 'badge-purple';
      case 'Repaying': return 'badge-blue';
      case 'Closed': return 'badge-gray';
      default: return 'badge-purple';
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="onboarding-header">
        <h1 className="page-title">On-Chain Explorer</h1>
        <p className="page-sub">
          All ISA proposals, pool balances, and repayment history — fully transparent, publicly verifiable on Stellar Testnet.
        </p>
      </div>

      {/* Aggregate Stats */}
      <div className="explorer-stats">
        <div className="glass-card explorer-stat-card">
          <Database className="w-5 h-5 text-purple-400 mb-2" />
          <span className="explorer-stat-value">{stats.activeIsas || 0}</span>
          <span className="explorer-stat-label">Total ISAs</span>
        </div>
        <div className="glass-card explorer-stat-card">
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
          <span className="explorer-stat-value">${(stats.totalFunded || 0).toLocaleString()}</span>
          <span className="explorer-stat-label">Total Funded</span>
        </div>
        <div className="glass-card explorer-stat-card">
          <Activity className="w-5 h-5 text-blue-400 mb-2" />
          <span className="explorer-stat-value">${(stats.totalRepaid || 0).toLocaleString()}</span>
          <span className="explorer-stat-label">Total Repaid</span>
        </div>
        <div className="glass-card explorer-stat-card">
          <Users className="w-5 h-5 text-yellow-400 mb-2" />
          <span className="explorer-stat-value">{stats.usersActive || 0}</span>
          <span className="explorer-stat-label">Active Users</span>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar glass-card">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search by earner address, name, or ISA ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}
        />
      </div>

      {/* ISA Table */}
      <div className="glass-card explorer-table-wrap">
        <div className="explorer-table-header">
          <h3 className="text-sm font-bold">All ISA Agreements</h3>
          <span className="text-xs text-text-muted">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loadingIsas ? (
          <div className="p-4">
            <SkeletonCard count={3} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="explorer-empty">
            <p>No ISA records found{query ? ` matching "${query}"` : ''}.</p>
          </div>
        ) : (
          <div className="explorer-table">
            <div className="explorer-table-head">
              <span>ID</span>
              <span>Earner</span>
              <span>Target</span>
              <span>Share</span>
              <span>Cap</span>
              <span>Duration</span>
              <span>Status</span>
              <span>Explorer</span>
            </div>
            {filtered.map((isa) => (
              <div key={isa.id} className="explorer-table-row">
                <span className="font-mono text-purple-400">#{isa.id}</span>
                <span className="font-mono text-xs" title={isa.earner}>
                  {isa.metadata?.name || `${isa.earner?.substring(0, 8)}…`}
                </span>
                <span>${(isa.fundingTarget || 0).toLocaleString()}</span>
                <span>{isa.incomeShare}%</span>
                <span>{isa.cap}x</span>
                <span>{isa.duration}mo</span>
                <span>
                  <span className={`badge ${statusColor(isa.status)}`}>{isa.status}</span>
                </span>
                <span>
                  {isa.txHash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${isa.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 text-xs"
                    >
                      Tx <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contract Address References */}
      <div className="glass-card mt-6 p-4">
        <h4 className="text-sm font-bold mb-3">Deployed Contract Addresses (Testnet)</h4>
        <div className="contract-addresses">
          {[
            { label: 'ISA Registry', env: 'VITE_REGISTRY_CONTRACT_ID' },
            { label: 'Funding Pool', env: 'VITE_POOL_CONTRACT_ID' },
            { label: 'Repayment Distributor', env: 'VITE_DISTRIBUTOR_CONTRACT_ID' },
          ].map(({ label, env }) => {
            const id = import.meta.env[env];
            return (
              <div key={label} className="contract-row">
                <span className="text-xs text-text-muted">{label}</span>
                {id ? (
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-purple-400 underline flex items-center gap-1"
                  >
                    {id.substring(0, 20)}… <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="font-mono text-xs text-text-muted">[not configured]</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
