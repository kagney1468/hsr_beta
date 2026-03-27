import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-black font-heading text-[var(--teal-900)] uppercase tracking-wide">{title}</h2>
      <div className="text-sm text-[var(--text)] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function TermsOfService() {
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
              <span className="material-symbols-outlined text-[14px]">gavel</span>
              Legal
            </div>
            <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Terms of Website Use</h1>
            <p className="text-sm text-[var(--muted)]">Last updated: March 2026</p>
          </div>

          {/* Copyright notice */}
          <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-sm text-[var(--teal-900)] font-semibold">
            Copyright 2026 Kadima Systems Ltd — Company Number 16746375
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 space-y-8">
            <p className="text-sm text-[var(--text)] leading-relaxed">
              These terms tell you the rules for using our website at{' '}
              <a href="https://homesalesready.co.uk" className="text-[var(--teal-600)] hover:underline">homesalesready.co.uk</a>{' '}
              and{' '}
              <a href="https://homesalesready.com" className="text-[var(--teal-600)] hover:underline">homesalesready.com</a>{' '}
              whether as a guest or registered user. <strong>By using our site you accept these terms.</strong> If you do not agree please do not use our site.
            </p>

            <div className="border-t border-[var(--border)]" />

            <Section title="About Us">
              <p>
                HomeSalesReady is operated by Kadima Systems Ltd, registered in England and Wales under company number 16746375.
              </p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Our Site">
              <p>We allow access to our site on a temporary basis and reserve the right to withdraw or change it at any time without notice.</p>
              <p>Keep your login details confidential. We may disable access if you breach these terms.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Property Pack Accuracy">
              <div className="p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 text-amber-900 text-sm leading-relaxed">
                <p className="font-bold mb-1">Important</p>
                <p>
                  You are solely responsible for the accuracy and completeness of all information and documents you upload to your property pack. HomeSalesReady provides a platform to collect and share property information but <strong>does not verify, warrant or accept liability</strong> for the accuracy of any information provided by sellers. Buyers, solicitors, surveyors and other parties access property packs in reliance on the seller's representations.
                </p>
              </div>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Intellectual Property">
              <p>We own all intellectual property rights in our site. You may not reproduce any part without our written consent.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Reliance on Information">
              <p>Contents of our site are for information only. We are not liable for any use or reliance on such materials.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Viruses and Hacking">
              <p>You must not misuse our site by introducing malicious material or attempting unauthorised access. Such actions are criminal offences.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Our Liability">
              <p>We exclude all liability for direct, indirect or consequential loss arising from use of our site to the extent permitted by law.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section title="Governing Law">
              <p>These terms are governed by the law of England and Wales. English courts have exclusive jurisdiction.</p>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
