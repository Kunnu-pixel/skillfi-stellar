import { useState } from 'react';
import { X, RefreshCw, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function InvestmentModal({ isa, isOpen, onClose, onInvestSubmit }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const remainingTarget = isa.fundingTarget - (isa.raised || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive investment amount.');
      setLoading(false);
      return;
    }
    if (numAmount > remainingTarget) {
      setError(`Maximum investment allowed is $${remainingTarget.toLocaleString()} USDC.`);
      setLoading(false);
      return;
    }

    try {
      await onInvestSubmit(isa.id, numAmount);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      // Surface a clean error — never a raw stack trace
      const msg = err?.message || 'Soroban transaction failed to submit.';
      if (msg.toLowerCase().includes('user declined') || msg.toLowerCase().includes('rejected')) {
        setError('Transaction was cancelled in Freighter.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setError('Insufficient USDC balance. Fund your Testnet account first.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invest-modal-title"
    >
      <div className="glass-card w-full max-w-md relative overflow-hidden border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close investment modal"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Investment Successful!</h3>
            <p className="text-sm text-text-secondary mb-6">
              Your investment of{' '}
              <strong className="text-emerald-400">${amount} USDC</strong> has been submitted
              on-chain. Pro-rata claim tokens are being minted.
            </p>
            <button onClick={onClose} className="w-full btn-primary py-2.5">
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Direct Funding
              </span>
              <h3 id="invest-modal-title" className="text-xl font-bold mt-1 mb-2">
                Fund ISA Proposal
              </h3>
              <p className="text-xs text-text-secondary">
                You are contributing USDC to support{' '}
                <strong>{isa.metadata?.name || `Earner #${isa.id}`}</strong>. In return, you
                receive a proportional share of their future income payments.
              </p>
            </div>

            {/* Terms summary */}
            <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-text-secondary flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>Earner Wallet</span>
                <span className="font-mono">{isa.earner?.substring(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span>Pledged Income</span>
                <strong>{isa.incomeShare}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Repayment Cap</span>
                <strong>{isa.cap}x raised</strong>
              </div>
              <div className="flex justify-between">
                <span>Remaining to Fill</span>
                <strong className="text-emerald-400">
                  ${remainingTarget.toLocaleString()} USDC
                </strong>
              </div>
            </div>

            {/* Amount input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invest-amount" className="text-xs font-semibold text-text-secondary">
                Investment Amount (USDC)
              </label>
              <div className="relative">
                <input
                  id="invest-amount"
                  type="number"
                  placeholder={`Max: ${remainingTarget}`}
                  min="1"
                  step="0.01"
                  max={remainingTarget}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-4 top-3 text-sm font-semibold text-text-muted">
                  USDC
                </span>
              </div>
              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Gas fees are settled in XLM. Ensure your wallet holds some XLM.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-lg"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Requesting Freighter Signature…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Confirm and Authorize
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
