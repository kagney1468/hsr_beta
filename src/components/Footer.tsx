import { Link } from 'react-router-dom';

export default function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`border-t border-[var(--border)] bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* GDPR notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)]">
          <span className="material-symbols-outlined text-[var(--teal-600)] text-[20px] mt-0.5 shrink-0">shield</span>
          <p className="text-xs text-[var(--text)] leading-relaxed">
            Your property information is securely encrypted. Personal details are never shared without your explicit permission. We are fully GDPR compliant.
          </p>
        </div>

        {/* Links + copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
            <Link to="/privacy-policy" className="text-xs text-[var(--muted)] hover:text-[var(--teal-600)] font-medium transition-colors px-1">
              Privacy Policy
            </Link>
            <span className="text-[var(--border)] text-xs">·</span>
            <Link to="/terms-of-service" className="text-xs text-[var(--muted)] hover:text-[var(--teal-600)] font-medium transition-colors px-1">
              Terms of Service
            </Link>
            <span className="text-[var(--border)] text-xs">·</span>
            <Link to="/cookie-policy" className="text-xs text-[var(--muted)] hover:text-[var(--teal-600)] font-medium transition-colors px-1">
              Cookie Policy
            </Link>
          </div>
          <p className="text-xs text-[var(--muted)] text-center sm:text-right">
            Copyright 2026 Kadima Systems Ltd. Company Number 16746375. Registered in England and Wales.
          </p>
        </div>
      </div>
    </footer>
  );
}
