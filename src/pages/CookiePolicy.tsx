import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[var(--teal-600)]">
            <span className="material-symbols-outlined text-2xl">home_filled</span>
            <span className="font-heading font-black text-[var(--teal-900)] text-lg tracking-tight">HomeSalesReady</span>
          </Link>
          <Link to="/login" className="text-sm font-bold text-[var(--teal-600)] hover:underline">← Back</Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
          {/* Title */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[10px] font-black text-[var(--teal-600)] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]">cookie</span>
              Legal
            </div>
            <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Cookie Policy</h1>
            <p className="text-sm text-[var(--muted)]">Last updated: March 2026</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-sm text-[var(--teal-900)] font-semibold">
            Copyright 2026 Kadima Systems Ltd
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 space-y-8">

            {/* What is a cookie */}
            <div className="space-y-3">
              <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">What Is a Cookie?</h2>
              <p className="text-sm text-[var(--text)] leading-relaxed">
                A cookie is a piece of information stored on your device that records how you use a website. When you revisit the site it can present tailored options based on your last visit. Cookies are used by nearly all websites and do not harm your system.
              </p>
              <p className="text-sm text-[var(--text)] leading-relaxed">
                We require your consent for all non-essential cookies. You can block cookies at any time through your browser settings, though this may affect site functionality.
              </p>
            </div>

            <div className="border-t border-[var(--border)]" />

            <div className="space-y-3">
              <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">How We Use Cookies</h2>
              <p className="text-sm text-[var(--text)] leading-relaxed">
                We use cookies to track your use of our website, understand how you use the site and improve our services.
              </p>
            </div>

            <div className="border-t border-[var(--border)]" />

            <div className="space-y-4">
              <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">Types of Cookies We Use</h2>
              <div className="space-y-3">
                {[
                  {
                    type: 'Session cookies',
                    desc: 'Stored only during your web session and deleted when you close your browser. Store an anonymous session ID to allow browsing without repeated logins.',
                    badge: 'Temporary',
                    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
                  },
                  {
                    type: 'Persistent cookies',
                    desc: 'Stored on your device after you close your browser. Used for Google Analytics.',
                    badge: 'Persistent',
                    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
                  },
                ].map(c => (
                  <div key={c.type} className="p-4 rounded-xl bg-[var(--teal-050)]/50 border border-[var(--border)] flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-[var(--teal-900)]">{c.type}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${c.badgeColor}`}>{c.badge}</span>
                      </div>
                      <p className="text-sm text-[var(--muted)]">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)]" />

            <div className="space-y-4">
              <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">Cookie Categories</h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--teal-050)] border-b border-[var(--border)]">
                      <th className="px-5 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Category</th>
                      <th className="px-5 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {[
                      { cat: 'Strictly Necessary', purpose: 'Essential for the website to function. Cannot be disabled.' },
                      { cat: 'Performance', purpose: 'Monitor and improve website performance. Count visits and identify traffic sources.' },
                      { cat: 'Functionality', purpose: 'Remember your choices and provide enhanced features.' },
                      { cat: 'Targeting', purpose: 'Record your visit to make advertising more relevant.' },
                    ].map(r => (
                      <tr key={r.cat} className="hover:bg-[var(--teal-050)]/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-[var(--teal-900)] whitespace-nowrap">{r.cat}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{r.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[var(--muted)]">We use only first party cookies on this website.</p>
              <p className="text-sm text-[var(--muted)]">Cookies expire after 30 days except for essential cookies.</p>
            </div>

            <div className="border-t border-[var(--border)]" />

            <div className="space-y-3">
              <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">Opting Out</h2>
              <p className="text-sm text-[var(--text)] leading-relaxed">
                You can opt out of Google Analytics tracking at{' '}
                <a href="http://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[var(--teal-600)] hover:underline">
                  tools.google.com/dlpage/gaoptout
                </a>.
              </p>
              <p className="text-sm text-[var(--text)]">
                Questions about cookies? Email{' '}
                <a href="mailto:hello@kadimasystems.co.uk" className="text-[var(--teal-600)] hover:underline">hello@kadimasystems.co.uk</a>.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  document.cookie = 'hsr_cookie_consent=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
                  window.location.reload();
                }}
                className="text-sm text-[var(--teal-600)] font-bold hover:underline"
              >
                Reset my cookie preferences
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
