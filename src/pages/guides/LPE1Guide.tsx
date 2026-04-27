import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black font-heading text-[#17afaf]">{title}</h2>
      <div className="text-sm text-[var(--text)] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function LPE1Guide() {
  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[var(--teal-600)]">
            <span className="material-symbols-outlined text-2xl">home_filled</span>
            <span className="font-heading font-black text-[var(--teal-900)] text-lg tracking-tight">HomeSalesReady</span>
          </Link>
          <Link to="/seller/property" className="text-sm font-bold text-[var(--teal-600)] hover:underline">
            ← Back to your property pack
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
          {/* Title block */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[10px] font-black text-[var(--teal-600)] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]">description</span>
              For leasehold sellers · 5 minute read
            </div>
            <h1 className="text-3xl font-black font-heading text-[var(--teal-900)] tracking-tight leading-tight">
              What is an LPE1 form — and why does it matter for your home sale?
            </h1>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            <Section title="So what actually is it?">
              <p>
                LPE1 stands for <strong>Leasehold Property Enquiries</strong>. It's a standard form that your buyer's
                solicitor will request during the conveyancing process. It asks your freeholder or managing agent to
                provide key information about the lease — things like:
              </p>
              <ul className="space-y-2 pl-1">
                {[
                  "How much is the service charge, and is there anything outstanding?",
                  "What's the ground rent, and does it increase?",
                  "Is there a reserve or sinking fund, and how much is in it?",
                  "Are there any planned major works coming up?",
                  "Is building insurance in place?",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-1 size-1.5 rounded-full bg-[#17afaf]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Why does it slow home sales down?">
              <p>
                Most sellers only request the LPE1 after they've accepted an offer. That means waiting — sometimes
                weeks — for the managing agent to respond. Some charge hefty fees. Some are notoriously slow.
                Meanwhile, your buyer is sitting there wondering what's going on. And if they're nervous enough,
                they walk.
              </p>
            </Section>

            <Section title="What should you do differently?">
              <p>
                <strong>Request it early.</strong> Before you even go to market if you can. You're entitled to request
                the LPE1 information yourself. Getting it upfront means you know exactly what's in it — no nasty
                surprises — and you can provide it to a buyer's solicitor the moment they ask for it. That alone can
                shave weeks off your home sale.
              </p>
            </Section>

            <Section title="One thing to watch">
              <p>
                If your ground rent is over £250 per year (or £1,000 in London), or if it's set to double over time,
                this can make your property harder to mortgage and therefore harder to sell. Better to know this before
                you go to market than after you've agreed a price.
              </p>
            </Section>

            <Section title="The bottom line">
              <p>
                The LPE1 isn't complicated — but it catches a lot of sellers off guard. Getting it sorted early is
                one of the simplest things you can do to keep your home sale moving.
              </p>
            </Section>
          </div>

          {/* CTA box */}
          <div className="p-6 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)]">
            <p className="text-sm text-[var(--teal-900)] leading-relaxed">
              <strong>HomeSalesReady</strong> helps leasehold sellers gather and organise the information buyers
              and solicitors need — before the sale starts.
            </p>
            <Link
              to="/signup/seller"
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#17afaf] text-white text-sm font-black hover:opacity-90 transition-opacity"
            >
              Get started free
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
