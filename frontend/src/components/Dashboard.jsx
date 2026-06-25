import React, { useState } from 'react';
import { LayoutDashboard, Compass, Send, BookOpen, MessageSquareCode, Award, CheckCircle, RefreshCw } from 'lucide-react';
import ISACard from './ISACard';
import SkeletonCard from './SkeletonCard';

export default function Dashboard({
  address,
  isas,
  stats,
  portfolio,
  loadingIsas = false,
  onInvestClick,
  onFeedbackSubmit,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('explore');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackUsability, setFeedbackUsability] = useState('5');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const handleFeedback = async (e) => {
    e.preventDefault();
    setFeedbackLoading(true);
    try {
      await onFeedbackSubmit({
        address: address || "Anonymous",
        usability: feedbackUsability,
        comments: feedbackText
      });
      setFeedbackSubmitted(true);
      setFeedbackText('');
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Telemetry Stats Headers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card flex flex-col p-4">
          <span className="text-xs text-text-muted">Total Value Funded</span>
          <h2 className="text-2xl font-extrabold gradient-text mt-1">
            ${stats.totalFunded?.toLocaleString() || "0"} USDC
          </h2>
        </div>
        <div className="glass-card flex flex-col p-4">
          <span className="text-xs text-text-muted">Total Repayments Split</span>
          <h2 className="text-2xl font-extrabold text-emerald-400 mt-1">
            ${stats.totalRepaid?.toLocaleString() || "0"} USDC
          </h2>
        </div>
        <div className="glass-card flex flex-col p-4">
          <span className="text-xs text-text-muted">Active ISAs Pledged</span>
          <h2 className="text-2xl font-extrabold mt-1">{stats.activeIsas || "0"}</h2>
        </div>
        <div className="glass-card flex flex-col p-4">
          <span className="text-xs text-text-muted">On-Chain Interaction Count</span>
          <h2 className="text-2xl font-extrabold text-purple-400 mt-1">{stats.repaymentCount || "0"}</h2>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-white/10 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'explore' 
              ? 'bg-purple-500/20 text-purple-400 font-bold' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Compass className="w-4 h-4" /> Explore Pools
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'portfolio' 
              ? 'bg-purple-500/20 text-purple-400 font-bold' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> My Portfolio
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column - Content List */}
        <div className="lg:col-span-2">
          {activeTab === 'explore' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Open Income Share Agreements</h3>
              {loadingIsas ? (
                <div className="dashboard-grid">
                  <SkeletonCard count={3} />
                </div>
              ) : isas.length === 0 ? (
                <div className="glass-card text-center py-8 text-text-muted text-sm">
                  No active ISA proposals found. <button className="underline text-purple-400" onClick={() => onNavigate?.('earner')}>Create the first one</button>.
                </div>
              ) : (
                <div className="dashboard-grid">
                  {isas.map(isa => (
                    <ISACard
                      key={isa.id}
                      isa={isa}
                      onInvestClick={onInvestClick}
                      isEarner={address === isa.earner}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Your Investments & Claim Balances</h3>
              {portfolio.length === 0 ? (
                <div className="glass-card text-center py-8 text-text-muted text-sm">
                  You do not hold any claim tokens yet. Explore open pools to invest.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {portfolio.map((claim, idx) => (
                    <div key={idx} className="glass-card flex justify-between items-center bg-purple-950/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">ISA Claim #{claim.isaId}</h4>
                          <p className="text-xs text-text-muted">Earner: {claim.earner.substring(0, 10)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-muted block">Claim Balance</span>
                        <strong className="text-emerald-400 font-bold">${claim.amount} USDC</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Feedback & Guides Widget */}
        <div className="flex flex-col gap-6">
          
          {/* Platform Guide */}
          <div className="glass-card bg-purple-950/10 border border-purple-500/20">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-purple-400">
              <BookOpen className="w-4 h-4" /> Quick Stellar Guide
            </h4>
            <ul className="text-xs text-text-secondary flex flex-col gap-2 list-disc list-inside">
              <li>Freighter operates on the <strong>Testnet</strong> network.</li>
              <li>Gas tokens (XLM) can be claimed for free from the Friendbot faucet.</li>
              <li>Contributions immediately lock and mint claim shares.</li>
              <li>Yields automatically post to your address as Earners repay.</li>
            </ul>
          </div>

          {/* Feedback Widget Form */}
          <div className="glass-card">
            <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4" /> Submit Tester Feedback
            </h4>
            <p className="text-xs text-text-muted mb-4">
              Help us refine the Stellar ISA MVP. All feedback is logged to our API server.
            </p>

            {feedbackSubmitted ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Thank you! Feedback has been successfully logged.</span>
              </div>
            ) : (
              <form onSubmit={handleFeedback} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-text-muted">
                    UX Rating (1 - 5 stars)
                  </label>
                  <select 
                    value={feedbackUsability} 
                    onChange={(e) => setFeedbackUsability(e.target.value)}
                    className="text-xs py-2"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                    <option value="4">⭐⭐⭐⭐ Great</option>
                    <option value="3">⭐⭐⭐ Neutral</option>
                    <option value="2">⭐⭐ Needs Work</option>
                    <option value="1">⭐ Confusing</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-text-muted">
                    Comments / Suggestions
                  </label>
                  <textarea
                    placeholder="What did you think of the wallet interaction?"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    className="text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="btn-primary py-2 text-xs flex items-center justify-center gap-2"
                >
                  {feedbackLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Submit Survey"
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
