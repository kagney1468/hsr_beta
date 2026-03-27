import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black font-heading text-[var(--teal-900)] flex items-center gap-3">
        <span className="size-7 rounded-lg bg-[var(--teal-600)] text-white text-[11px] font-black flex items-center justify-center shrink-0">{n}</span>
        {title}
      </h2>
      <div className="text-sm text-[var(--text)] leading-relaxed space-y-2 pl-10">{children}</div>
    </div>
  );
}

export default function PrivacyPolicy() {
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

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
          {/* Title */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[10px] font-black text-[var(--teal-600)] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]">privacy_tip</span>
              Legal
            </div>
            <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Website Privacy Notice</h1>
            <p className="text-sm text-[var(--muted)]">Last updated: March 2026</p>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl p-8 space-y-8">

            <Section n={1} title="Introduction">
              <p>
                This privacy notice provides you with details of how we collect and process your personal data through your use of our site at{' '}
                <a href="https://homesalesready.co.uk" className="text-[var(--teal-600)] hover:underline">homesalesready.co.uk</a>{' '}
                and{' '}
                <a href="https://homesalesready.com" className="text-[var(--teal-600)] hover:underline">homesalesready.com</a>.
              </p>
              <p>
                Kadima Systems Ltd are the data controller and we are responsible for your personal data. If you have any questions about this privacy notice, please contact our Data Protection Officer at{' '}
                <a href="mailto:hello@kadimasystems.co.uk" className="text-[var(--teal-600)] hover:underline">hello@kadimasystems.co.uk</a>.
              </p>
              <div className="mt-3 p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] space-y-1">
                <p><span className="font-semibold">Full legal name:</span> Kadima Systems Ltd</p>
                <p><span className="font-semibold">Email:</span>{' '}
                  <a href="mailto:hello@kadimasystems.co.uk" className="text-[var(--teal-600)] hover:underline">hello@kadimasystems.co.uk</a>
                </p>
                <p><span className="font-semibold">Postal address:</span> Bayside Business Centre, Willis Way, Poole, BH15 3TB</p>
              </div>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={2} title="What Data We Collect and Why">
              <p>We may process the following categories of personal data:</p>
              <div className="mt-3 space-y-3">
                {[
                  { type: 'Communication Data', desc: 'Any communications you send us. Processed for record keeping and legal claims. Lawful ground: legitimate interests.' },
                  { type: 'Customer Data', desc: 'Name, billing address, email, phone, purchase details. Processed to supply services and keep transaction records. Lawful ground: performance of contract.' },
                  { type: 'User Data', desc: 'How you use our website and any content you post. Processed to operate our website securely. Lawful ground: legitimate interests.' },
                  { type: 'Technical Data', desc: 'IP address, login data, browser details, page views. Processed to analyse website use and protect our business. Lawful ground: legitimate interests.' },
                  { type: 'Marketing Data', desc: 'Your marketing preferences and communication preferences. Processed to deliver relevant content. Lawful ground: legitimate interests or consent.' },
                  { type: 'Property Data', desc: 'Property address, documents, material information and transaction data you upload to create a property pack. Processed to provide the HomeSalesReady service. Lawful ground: performance of contract.' },
                ].map(item => (
                  <div key={item.type} className="p-3 rounded-lg bg-[var(--teal-050)]/50 border border-[var(--border)]">
                    <p className="font-semibold text-[var(--teal-900)]">{item.type}</p>
                    <p className="text-[var(--muted)] mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={3} title="How We Collect Your Data">
              <ul className="list-disc list-inside space-y-1 text-[var(--muted)]">
                <li>Directly from you when you fill in forms or send emails.</li>
                <li>Automatically through cookies and similar technologies.</li>
                <li>From third parties such as analytics providers.</li>
              </ul>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={4} title="Marketing">
              <p>
                We will only send marketing communications with your consent or where we have a legitimate interest. You can opt out at any time by following the unsubscribe link in any marketing email or emailing{' '}
                <a href="mailto:hello@kadimasystems.co.uk" className="text-[var(--teal-600)] hover:underline">hello@kadimasystems.co.uk</a>.
              </p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={5} title="Who We Share Your Data With">
              <ul className="list-disc list-inside space-y-1 text-[var(--muted)]">
                <li>Other companies in our group.</li>
                <li>IT service providers.</li>
                <li>Professional advisers.</li>
                <li>Government bodies where required.</li>
              </ul>
              <p className="mt-2">We require all third parties to respect your data security.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={6} title="International Transfers">
              <p>We do not transfer your personal data outside the UK.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={7} title="Data Security">
              <p>We have security measures to prevent accidental loss, alteration or unauthorised access. We have breach notification procedures in place.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={8} title="Data Retention">
              <p>We retain data only as long as necessary. For tax purposes we keep customer data for six years. Property pack data is retained for seven years after transaction completion.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={9} title="Your Legal Rights">
              <p>You have the right to access, correct, erase, restrict, transfer and object to processing of your data.</p>
              <p>
                To exercise these rights email{' '}
                <a href="mailto:hello@kadimasystems.co.uk" className="text-[var(--teal-600)] hover:underline">hello@kadimasystems.co.uk</a>.
                You may complain to the ICO at{' '}
                <a href="https://www.ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[var(--teal-600)] hover:underline">www.ico.org.uk</a>.
              </p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={10} title="Third Party Links">
              <p>We are not responsible for third party websites linked from our site.</p>
            </Section>

            <div className="border-t border-[var(--border)]" />

            <Section n={11} title="Cookies">
              <p>
                For details of cookies we use please see our{' '}
                <Link to="/cookie-policy" className="text-[var(--teal-600)] hover:underline font-semibold">Cookie Policy</Link>.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
