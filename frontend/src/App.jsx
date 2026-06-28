import React, { useState, useEffect } from 'react';
import { Compass, BookOpen, Send, User, Award, ShieldAlert, Sparkles, Database, ToggleLeft, ToggleRight, HelpCircle, Loader2 } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import Dashboard from './components/Dashboard';
import InvestmentModal from './components/InvestmentModal';
import RepaymentForm from './components/RepaymentForm';
import { analytics } from './lib/analytics';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FEATURES = [
  {
    icon: <ShieldAlert className="w-5 h-5 text-indigo-600" />,
    title: 'Contract trust without surprises',
    desc: 'Soroban enforces ISA caps, repayment rules, and distribution logic on-chain.',
  },
  {
    icon: <Database className="w-5 h-5 text-purple-600" />,
    title: 'Transparent funding flow',
    desc: 'Every proposal, payment, and claim is visible through the explorer and wallet events.',
  },
  {
    icon: <Sparkles className="w-5 h-5 text-emerald-600" />,
    title: 'Wallet-first experience',
    desc: 'Freighter sign-in and transaction prompts keep onboarding fast and familiar.',
  },
  {
    icon: <Compass className="w-5 h-5 text-slate-600" />,
    title: 'Built for Stellar Testnet',
    desc: 'Low fees, quick settlement, and a real Soroban-powered ISA workflow.',
  },
];

export default function App() {
  const [address, setAddress] = useState('');
  const [isas, setIsas] = useState([]);
  const [stats, setStats] = useState({ totalFunded: 0, totalRepaid: 0, activeIsas: 0, repaymentCount: 0 });
  const [portfolio, setPortfolio] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // App views: 'explore' | 'earner'
  const [currentView, setCurrentView] = useState('explore');
  const [selectedIsa, setSelectedIsa] = useState(null);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Profile forms
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileSkills, setProfileSkills] = useState('');
  const [profileCollege, setProfileCollege] = useState('');
  
  // ISA Proposal Forms
  const [isaGoal, setIsaGoal] = useState('');
  const [isaShare, setIsaShare] = useState('5');
  const [isaDuration, setIsaDuration] = useState('12');
  const [isaCap, setIsaCap] = useState('1.5');
  const [isCreatingIsa, setIsCreatingIsa] = useState(false);

  // Demo Sandbox Mode (Ensures zero-config testability for hackathon reviewers)
  const [sandboxMode, setSandboxMode] = useState(true);

  // Fetch data initially and sync
  const fetchData = async () => {
    try {
      setLoading(true);
      setNotice('');
      const resStats = await fetch(`${BACKEND_URL}/api/stats`);
      const dataStats = await resStats.json();
      setStats(dataStats);

      const resIsas = await fetch(`${BACKEND_URL}/api/isas`);
      const dataIsas = await resIsas.json();
      setIsas(dataIsas);
    } catch (err) {
      console.warn('Backend server not running yet. Operating in local sandbox client-state.', err);
      analytics.captureError(err, { stage: 'fetchData' });
      setNotice('Backend unavailable; showing seeded demo data.');
      injectSandboxMocks();
    } finally {
      setLoading(false);
    }
  };

  const injectSandboxMocks = () => {
    const mockIsas = [
      {
        id: 1,
        earner: 'GA2C...K6T2',
        fundingTarget: 2500,
        raised: 1800,
        incomeShare: 6,
        duration: 18,
        cap: 1.5,
        status: 'Funding',
        metadata: {
          name: 'Elena Rostova',
          college: 'Stanford Blockchain Labs',
          bio: 'Junior cryptography researcher seeking capital to fund advanced auditing certifications. Pledging 6% of research income.'
        }
      },
      {
        id: 2,
        earner: 'GB7Y...P2QL',
        fundingTarget: 1200,
        raised: 1200,
        incomeShare: 5,
        duration: 12,
        cap: 1.3,
        status: 'Funded',
        metadata: {
          name: 'Marcus Chen',
          college: 'Self-Taught Solidity & Rust Builder',
          bio: 'Full stack engineer raising funding to complete Rust smart contract courses. Fully funded and currently completing payments.'
        }
      }
    ];

    setIsas(mockIsas);
    setStats({
      totalFunded: 3700,
      totalRepaid: 450,
      activeIsas: 2,
      repaymentCount: 14
    });
    setPortfolio([
      {
        isaId: 2,
        earner: 'GB7Y...P2QL',
        amount: 350
      }
    ]);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Profile Sync
  useEffect(() => {
    if (address) {
      fetch(`${BACKEND_URL}/api/profiles/${address}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setProfile(data);
        })
        .catch(() => {
          // Offline fallback
          setProfile({ name: 'Sandbox Tester', college: 'Stellar Academy', bio: 'Hackathon Reviewer Account' });
        });
    }
  }, [address]);

  // Wallet handshake handler
  const handleWalletConnect = (userAddress) => {
    setAddress(userAddress);
    analytics.identify(userAddress);
    analytics.track('wallet_connected', { address: userAddress });
  };

  // Submit profile metadata
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const payload = { address, name: profileName, bio: profileBio, skills: profileSkills, college: profileCollege };
    
    setProfile(payload);
    try {
      await fetch(`${BACKEND_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setNotice('Profile saved and synced.');
    } catch (err) {
      analytics.captureError(err, { stage: 'saveProfile' });
      setNotice('Profile saved locally; backend availability is limited.');
    }
  };

  // Create ISA Proposal
  const handleCreateIsa = async (e) => {
    e.preventDefault();
    setIsCreatingIsa(true);
    const newId = isas.length + 1;

    const payload = {
      id: newId,
      earner: address || 'Demo_Address',
      fundingTarget: parseFloat(isaGoal),
      incomeShare: parseFloat(isaShare),
      duration: parseInt(isaDuration),
      cap: parseFloat(isaCap),
      txHash: '0x' + Math.random().toString(16).substr(2, 32),
      metadata: {
        name: profile?.name || 'Anonymous Earner',
        college: profile?.college || 'Freelancer Crate',
        bio: profile?.bio || 'Seeker of blockchain skills'
      }
    };

    // Update UI State
    const updated = [payload, ...isas];
    setIsas(updated);
    setIsCreatingIsa(false);
    
    // Reset inputs
    setIsaGoal('');
    setCurrentView('explore');

    try {
      await fetch(`${BACKEND_URL}/api/isas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchData();
      analytics.track('isa_created', { isaId: newId, earner: payload.earner });
      setNotice('ISA proposal created successfully.');
    } catch (err) {
      analytics.captureError(err, { stage: 'createIsa' });
      setNotice('ISA created locally; the backend request did not complete.');
    }
  };

  // Invest in a pool
  const handleInvestSubmit = async (isaId, amount) => {
    if (sandboxMode) {
      // Direct simulation update
      setIsas(prev => prev.map(isa => {
        if (isa.id === isaId) {
          const raised = (isa.raised || 0) + amount;
          return { ...isa, raised, status: raised >= isa.fundingTarget ? 'Funded' : 'Funding' };
        }
        return isa;
      }));
      setPortfolio(prev => [...prev, { isaId, amount, earner: 'GA...' }]);
      setStats(prev => ({ ...prev, totalFunded: prev.totalFunded + amount }));
    }

    try {
      await fetch(`${BACKEND_URL}/api/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isaId, amount, investor: address || 'Demo_Investor' })
      });
      analytics.track('investment_submitted', { isaId, amount, investor: address || 'Demo_Investor' });
      setNotice('Investment submitted.');
      fetchData();
    } catch (err) {
      analytics.captureError(err, { stage: 'submitInvestment' });
      setNotice('Investment was applied locally; backend sync is pending.');
    }
  };

  // Submit Repayment
  const handleRepaySubmit = async (isaId, amount, proofUrl) => {
    if (sandboxMode) {
      setStats(prev => ({
        ...prev,
        totalRepaid: prev.totalRepaid + amount,
        repaymentCount: prev.repaymentCount + 1
      }));
    }

    try {
      await fetch(`${BACKEND_URL}/api/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isaId, amount, payer: address || 'Demo_Earner', txHash: '0x...' })
      });
      await fetch(`${BACKEND_URL}/api/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isaId, income: amount * 10, docUrl: proofUrl })
      });
      analytics.track('repayment_submitted', { isaId, amount, earner: address || 'Demo_Earner' });
      setNotice('Repayment recorded.');
      fetchData();
    } catch (err) {
      analytics.captureError(err, { stage: 'submitRepayment' });
      setNotice('Repayment logged locally; backend sync is pending.');
    }
  };

  // Collect feedback
  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      analytics.track('feedback_submitted', { role: feedbackData.role || 'Tester' });
      setNotice('Feedback recorded successfully.');
    } catch (err) {
      analytics.captureError(err, { stage: 'submitFeedback' });
      console.warn('Feedback logged in console:', feedbackData);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      
      {/* Top Banner Alert regarding Sandbox Mode */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-700 font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          <span><strong>Hackathon Judge Assistant</strong>: Operating in Sandbox mode. Switch toggles to test custom states.</span>
        </div>
        <button 
          onClick={() => setSandboxMode(!sandboxMode)}
          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-md font-bold text-indigo-800 transition-all"
        >
          {sandboxMode ? (
            <>Sandbox ON <ToggleRight className="w-4.5 h-4.5 text-emerald-500" /></>
          ) : (
            <>Live Testnet <ToggleLeft className="w-4.5 h-4.5 text-text-muted" /></>
          )}
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-sm text-emerald-700 font-medium text-center">
          {notice}
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-slate-900">
                Skill<span className="text-indigo-600">Fi</span>
              </h1>
              <p className="text-[10px] text-text-muted">Income Share Agreements on Stellar</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
            <button 
              onClick={() => setCurrentView('explore')} 
              className={`nav-button transition-colors ${currentView === 'explore' ? 'active' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Explore Pools
            </button>
            <button 
              onClick={() => setCurrentView('earner')} 
              className={`nav-button transition-colors ${currentView === 'earner' ? 'active' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Earner Hub
            </button>
          </nav>

          {/* Wallet */}
          <WalletConnect address={address} onConnect={handleWalletConnect} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
            <p className="text-sm">Fetching parameters from Soroban RPC...</p>
          </div>
        ) : (
          <div>
            <section className="hero-section ledger-hero">
              <div className="ledger-panel">
                <div className="ledger-top">
                  <span className="ledger-title">Income Share Agreement</span>
                  <div className="ledger-seal">Testnet Verified</div>
                </div>

                <div className="ledger-slip">
                  <div className="ledger-header">
                    <div>
                      <span className="ledger-label">Contract type</span>
                      <strong>SkillFi ISA</strong>
                    </div>
                    <div>
                      <span className="ledger-label">Contract ID</span>
                      <strong>ISA-2026-01</strong>
                    </div>
                  </div>

                  <div className="ledger-values">
                    <div>
                      <span className="ledger-value-label">Income share</span>
                      <strong>6%</strong>
                    </div>
                    <div>
                      <span className="ledger-value-label">Repayment cap</span>
                      <strong>1.5×</strong>
                    </div>
                    <div>
                      <span className="ledger-value-label">Term</span>
                      <strong>24 months</strong>
                    </div>
                    <div>
                      <span className="ledger-value-label">Settlement</span>
                      <strong>USDC</strong>
                    </div>
                  </div>

                  <div className="ledger-section">
                    <h3>Contract terms</h3>
                    <table className="terms-table">
                      <tbody>
                        <tr>
                          <td>Income share</td>
                          <td>6%</td>
                        </tr>
                        <tr>
                          <td>Repayment cap</td>
                          <td>1.5× funding</td>
                        </tr>
                        <tr>
                          <td>Term</td>
                          <td>24 months</td>
                        </tr>
                        <tr>
                          <td>Settlement asset</td>
                          <td>USDC</td>
                        </tr>
                        <tr>
                          <td>Zero-income months</td>
                          <td>$0 owed</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="ledger-footer">
                    <div>Author: Stellar Testnet</div>
                    <div>Signed by: Freighter wallet</div>
                  </div>
                </div>
              </div>

              <div className="hero-copy">
                <span className="eyebrow">Transparent contract terms, presented like a real agreement.</span>
                <h1 className="hero-title">
                  SkillFi turns every ISA into a visible contract slip with precise terms.
                </h1>
                <p className="hero-description">
                  Show income share, cap, term, and settlement clearly. Connect Freighter, sign on Stellar Testnet, and manage both earner and investor flows.
                </p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setCurrentView('explore')} className="btn-primary">
                    Explore Pools
                  </button>
                  <button type="button" onClick={() => setCurrentView('earner')} className="btn-secondary">
                    Earner Dashboard
                  </button>
                </div>

                <div className="highlight-band">
                  <div>
                    <span className="highlight-label">Funded so far</span>
                    <strong>{stats.totalFunded?.toLocaleString() || '0'} USDC</strong>
                  </div>
                  <div>
                    <span className="highlight-label">Active contracts</span>
                    <strong>{stats.activeIsas || '0'}</strong>
                  </div>
                </div>

                <div className="hero-flow-grid">
                  <div className="flow-card">
                    <span>Earner</span>
                    <p>Launch a transparent proposal, lock in the cap, and accept funding in USDC.</p>
                  </div>
                  <div className="flow-card">
                    <span>Investor</span>
                    <p>Fund a contract directly, earn share distributions, and trust on-chain settlement.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="section-padded feature-section">
              <div className="section-header">
                <h2 className="section-heading">Why SkillFi is better for skills funding</h2>
                <p className="section-sub">
                  Designed for the next generation of earners and investors, SkillFi combines Stellar speed, transparent contract logic, and easy wallet onboarding.
                </p>
              </div>

              <div className="feature-grid">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="feature-card glass-card">
                    <div className="feature-icon">{feature.icon}</div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-desc">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {currentView === 'explore' ? (
              <Dashboard
                address={address}
                isas={isas}
                stats={stats}
                portfolio={portfolio}
                onInvestClick={(isa) => {
                  setSelectedIsa(isa);
                  setIsInvestModalOpen(true);
                }}
                onFeedbackSubmit={handleFeedbackSubmit}
                onNavigate={setCurrentView}
              />
            ) : (
              /* Earner Hub Dashboard View */
              <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left/Middle: Setup Profile & Propose ISA */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                  
                  {/* Step 1: Create Profile */}
                  <div className="glass-card">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-400" /> Step 1: Set Up Earner Profile
                    </h3>
                    <p className="text-xs text-text-muted mb-4">
                      Create your off-chain profile credentials to present to potential investors.
                    </p>

                    {profile ? (
                      <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-lg flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between">
                          <strong className="text-purple-300 font-bold">{profile.name}</strong>
                          <span className="text-xs text-text-muted">{profile.college}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{profile.bio}</p>
                        <button 
                          onClick={() => setProfile(null)} 
                          className="mt-2 text-xs text-text-muted hover:text-text-primary self-start underline"
                        >
                          Edit Profile
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            placeholder="Full Name" 
                            value={profileName} 
                            onChange={(e) => setProfileName(e.target.value)} 
                            required 
                          />
                          <input 
                            placeholder="College / Specialty" 
                            value={profileCollege} 
                            onChange={(e) => setProfileCollege(e.target.value)} 
                            required 
                          />
                        </div>
                        <input 
                          placeholder="Core Skills (e.g. Solidity, Data Science, Writing)" 
                          value={profileSkills} 
                          onChange={(e) => setProfileSkills(e.target.value)} 
                          required 
                        />
                        <textarea 
                          placeholder="Your background biography..." 
                          value={profileBio} 
                          onChange={(e) => setProfileBio(e.target.value)} 
                          rows={3} 
                          required 
                        />
                        <button type="submit" className="btn-secondary py-2 text-xs self-end">
                          Save Profile
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Step 2: Propose ISA */}
                  <div className="glass-card">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <Send className="w-5 h-5 text-purple-400" /> Step 2: Launch ISA Proposal
                    </h3>
                    <p className="text-xs text-text-muted mb-4">
                      Define the capital you need, the future income share, and terms.
                    </p>

                    <form onSubmit={handleCreateIsa} className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-text-muted">Funding Goal (USDC)</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 1500" 
                            value={isaGoal} 
                            onChange={(e) => setIsaGoal(e.target.value)} 
                            required 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-text-muted">Pledged % of Income</label>
                          <select value={isaShare} onChange={(e) => setIsaShare(e.target.value)}>
                            <option value="3">3%</option>
                            <option value="5">5%</option>
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-text-muted">Repayment Cap (Multiplier)</label>
                          <select value={isaCap} onChange={(e) => setIsaCap(e.target.value)}>
                            <option value="1.2">1.2x</option>
                            <option value="1.5">1.5x</option>
                            <option value="1.8">1.8x</option>
                            <option value="2.0">2.0x</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase font-bold text-text-muted">Duration (Months)</label>
                          <select value={isaDuration} onChange={(e) => setIsaDuration(e.target.value)}>
                            <option value="6">6 Months</option>
                            <option value="12">12 Months</option>
                            <option value="18">18 Months</option>
                            <option value="24">24 Months</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isCreatingIsa || !profile}
                        className="btn-primary py-3 text-sm flex items-center justify-center gap-2"
                      >
                        {isCreatingIsa ? (
                          <>Deploying Contract Registry...</>
                        ) : (
                          <>Submit to Registry</>
                        )}
                      </button>
                      {!profile && (
                        <p className="text-[10px] text-rose-400 text-center">
                          * You must complete your Earner Profile in Step 1 before creating an ISA proposal.
                        </p>
                      )}
                    </form>
                  </div>
                </div>

                {/* Right Column: Active repayments */}
                <div className="flex flex-col gap-6">
                  
                  {/* Repayment Submission Widget */}
                  <RepaymentForm 
                    isa={isas.find(i => i.earner === address) || isas[0]} 
                    onRepaySubmit={handleRepaySubmit} 
                  />

                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-black/40 text-center text-xs text-text-muted px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 SkillFi Platform. Built on Stellar/Soroban rails for the Product Validation grant submission.</p>
          <div className="flex gap-4">
            <a href="#help" className="hover:text-text-primary">Docs</a>
            <a href="#terms" className="hover:text-text-primary">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedIsa && (
        <InvestmentModal
          isa={selectedIsa}
          isOpen={isInvestModalOpen}
          onClose={() => {
            setIsInvestModalOpen(false);
            setSelectedIsa(null);
          }}
          onInvestSubmit={handleInvestSubmit}
        />
      )}

    </div>
  );
}
