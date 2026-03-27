import { useState, useEffect } from 'react';

const COOKIE_NAME = 'hsr_cookie_consent';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState({ performance: true, functionality: true, targeting: false });

  useEffect(() => {
    const existing = getCookie(COOKIE_NAME);
    if (!existing) setVisible(true);
  }, []);

  const acceptAll = () => {
    setCookie(COOKIE_NAME, 'accepted');
    setVisible(false);
  };

  const savePreferences = () => {
    setCookie(COOKIE_NAME, JSON.stringify({ essential: true, ...prefs }));
    setVisible(false);
    setShowPrefs(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto bg-white border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {!showPrefs ? (
          /* ── Main banner ── */
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
            <div className="flex items-start gap-3 flex-1">
              <span className="material-symbols-outlined text-[var(--teal-600)] text-[22px] shrink-0 mt-0.5">cookie</span>
              <div>
                <p className="font-bold text-sm text-[var(--teal-900)]">We use cookies to improve your experience.</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Essential cookies are always active.{' '}
                  <button
                    onClick={() => setShowPrefs(true)}
                    className="text-[var(--teal-600)] underline underline-offset-2 hover:no-underline"
                  >
                    Learn more
                  </button>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setShowPrefs(true)}
                className="flex-1 sm:flex-none h-10 px-5 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--muted)] hover:bg-[var(--teal-050)] hover:text-[var(--teal-900)] transition-colors"
              >
                Manage Preferences
              </button>
              <button
                onClick={acceptAll}
                className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-[var(--teal-600)] text-white text-sm font-bold hover:bg-[var(--teal-900)] transition-colors"
              >
                Accept All Cookies
              </button>
            </div>
          </div>
        ) : (
          /* ── Preferences panel ── */
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black font-heading text-[var(--teal-900)]">Cookie Preferences</h3>
              <button onClick={() => setShowPrefs(false)} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--teal-050)] text-[var(--muted)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Essential — always on */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)]">
                <div>
                  <p className="font-bold text-sm text-[var(--teal-900)]">Strictly Necessary</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Essential for the website to function. Cannot be disabled.</p>
                </div>
                <span className="text-[10px] font-black text-[var(--teal-600)] uppercase tracking-wider bg-white border border-[var(--border)] px-2 py-1 rounded-full">Always On</span>
              </div>

              {[
                { key: 'performance', label: 'Performance', desc: 'Helps us understand how visitors use the site (e.g. Google Analytics).' },
                { key: 'functionality', label: 'Functionality', desc: 'Remember your choices and provide enhanced features.' },
                { key: 'targeting', label: 'Targeting', desc: 'Record your visit to make advertising more relevant.' },
              ].map(cat => (
                <label
                  key={cat.key}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    prefs[cat.key as keyof typeof prefs]
                      ? 'bg-[var(--teal-050)] border-[var(--teal-600)]/30'
                      : 'bg-white border-[var(--border)]'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-[var(--teal-900)]">{cat.label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{cat.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs[cat.key as keyof typeof prefs]}
                    onChange={e => setPrefs(p => ({ ...p, [cat.key]: e.target.checked }))}
                    className="size-4 accent-[var(--teal-600)] ml-4 shrink-0"
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={acceptAll}
                className="flex-1 h-11 rounded-xl bg-[var(--teal-600)] text-white text-sm font-bold hover:bg-[var(--teal-900)] transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={savePreferences}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors"
              >
                Save My Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
