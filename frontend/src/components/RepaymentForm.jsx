import { useState, useRef } from 'react';
import { RefreshCw, FileText, Send, Sparkles, UploadCloud, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RepaymentForm({ isa, onRepaySubmit }) {
  const [income, setIncome] = useState('');
  const [proofFile, setProofFile] = useState(null);   // File object for upload
  const [proofUrl, setProofUrl] = useState('');        // URL after upload / manual entry
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isa) return null;

  const pledgedPercent = isa.incomeShare || 5;
  const computedRepayment = income
    ? Math.max(0, (parseFloat(income) * pledgedPercent) / 100).toFixed(2)
    : '0.00';

  // ── Upload file to backend ──────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('proof', file);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setProofUrl(data.url);
    } catch (err) {
      setError(`File upload failed: ${err.message}`);
      setProofFile(null);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setProofFile(null);
    setProofUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit repayment ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numIncome = parseFloat(income);
    if (isNaN(numIncome) || numIncome < 0) {
      setError('Please enter a valid income amount.');
      setLoading(false);
      return;
    }
    if (!proofUrl) {
      setError('Please attach an income proof document before submitting.');
      setLoading(false);
      return;
    }

    try {
      await onRepaySubmit(isa.id, parseFloat(computedRepayment), proofUrl);
      setSuccess(true);
      setIncome('');
      clearFile();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process repayment transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card max-w-lg mx-auto">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-1">Submit Income Repayment</h3>
        <p className="text-xs text-text-secondary">
          Log your monthly earnings, attach income proof, and distribute USDC to your investors.
        </p>
      </div>

      {success ? (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-center flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold">Repayment Dispatched!</h4>
          <p className="text-xs text-text-secondary">
            Your repayment of{' '}
            <strong className="text-emerald-400">${computedRepayment} USDC</strong> has been
            split and sent directly to your investors on-chain.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-3 px-4 py-1.5 btn-secondary text-xs rounded"
          >
            Submit Another Month
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Income input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="income-amount" className="text-xs font-semibold text-text-secondary">
              Reported Monthly Income (USDC)
            </label>
            <div className="relative">
              <input
                id="income-amount"
                type="number"
                placeholder="e.g. 3000"
                min="0"
                step="0.01"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                disabled={loading}
              />
              <span className="absolute right-4 top-3 text-sm font-semibold text-text-muted">
                USDC
              </span>
            </div>
          </div>

          {/* File upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Income Proof Document
            </label>

            {proofFile ? (
              /* File attached state */
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400 flex-1 truncate">{proofFile.name}</span>
                {uploading && <RefreshCw className="w-3.5 h-3.5 text-text-muted animate-spin" />}
                {!uploading && (
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove file"
                    className="text-text-muted hover:text-rose-400 transition-colors"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* Drop zone */
              <label
                htmlFor="proof-file"
                className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-lg border border-dashed border-white/15 text-text-muted hover:border-purple-500/50 hover:text-text-secondary transition-colors cursor-pointer"
                aria-label="Upload income proof file"
              >
                <UploadCloud className="w-6 h-6" />
                <span className="text-xs text-center">
                  Drag & drop or{' '}
                  <span className="text-purple-400 font-semibold underline">browse</span>
                  <br />
                  PDF, JPG, PNG · max 5 MB
                </span>
                <input
                  id="proof-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={loading}
                />
              </label>
            )}

            <p className="text-[10px] text-text-muted">
              Payslips, bank statements, or invoices. Hash logged on-chain via the verification API.
            </p>
          </div>

          {/* Live math preview */}
          {income && (
            <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-lg flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span>Income pledged</span>
                <span>{pledgedPercent}%</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-purple-400 mt-1 pt-1 border-t border-white/5">
                <span>Repayment due</span>
                <span>${computedRepayment} USDC</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading || !income || !proofUrl}
            className="btn-primary py-3 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Signing Repayment Tx…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Repay ${computedRepayment} USDC
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
