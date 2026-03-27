import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Footer from '../components/Footer';

const STEPS = [
  {
    number: '01',
    icon: 'home_work',
    title: 'Property details',
    desc: 'Address, type, tenure, bedrooms — the basics buyers and solicitors need from day one.',
  },
  {
    number: '02',
    icon: 'info',
    title: 'Material information',
    desc: 'Utilities, flood risk, planning history and more. Required under Trading Standards guidance.',
  },
  {
    number: '03',
    icon: 'folder_open',
    title: 'Documents',
    desc: 'Upload title deeds, EPC certificate, warranties and other key certificates.',
  },
  {
    number: '04',
    icon: 'verified',
    title: 'Final declaration',
    desc: 'Confirm the information is accurate to the best of your knowledge.',
  },
  {
    number: '05',
    icon: 'share',
    title: 'Share your pack',
    desc: 'Generate a secure link for buyers, solicitors and your estate agent.',
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');

  useEffect(() => {
    async function loadName() {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('full_name')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (data?.full_name) setName(data.full_name.split(' ')[0]);
    }
    loadName();
  }, [user]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 md:px-10 py-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl text-[var(--teal-500)]">home_filled</span>
        <span className="font-heading font-black text-lg tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl space-y-14">

          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-600)] text-xs font-semibold uppercase tracking-widest mb-2">
              <span className="material-symbols-outlined text-sm">celebration</span>
              You're in
            </div>
            <h1 className="text-5xl md:text-6xl font-black font-heading tracking-tighter text-[var(--teal-900)] leading-none">
              {name ? `Welcome, ${name}.` : 'Welcome.'}
            </h1>
            <p className="text-xl text-[var(--muted)] max-w-xl mx-auto leading-relaxed">
              You're about to build a complete property pack — the fastest way to sell your home in the UK.
            </p>
          </div>

          {/* Why it matters */}
          <Card className="p-8 md:p-10 space-y-4 bg-[var(--teal-050)] border-[var(--teal-500)]">
            <div className="flex items-start gap-4">
              <div className="size-10 bg-[var(--teal-600)] text-white flex items-center justify-center rounded-xl shrink-0">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <div>
                <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">Why a property pack?</h2>
                <p className="text-[var(--muted)] mt-1 leading-relaxed">
                  Over <strong>30% of UK property sales fall through</strong> — most due to delays in gathering legal paperwork.
                  A complete pack prepared <em>before</em> listing cuts the time to exchange by up to 8 weeks and signals to
                  buyers that you are a serious, organised seller.
                </p>
              </div>
            </div>
          </Card>

          {/* Steps */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">Your five steps</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {STEPS.map(step => (
                <Card key={step.number} className="p-6 space-y-3 group hover:bg-[var(--teal-050)] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[var(--teal-500)] tracking-widest">{step.number}</span>
                    <span className="material-symbols-outlined text-[var(--teal-600)] text-xl">{step.icon}</span>
                  </div>
                  <h3 className="font-black font-heading text-[var(--teal-900)] text-base">{step.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{step.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-3 pt-4">
            <Button
              variant="primary"
              className="h-14 px-10 text-base font-heading font-bold rounded-2xl"
              onClick={() => navigate('/add-property')}
            >
              <span className="material-symbols-outlined mr-2">add_home</span>
              Add your property to get started
            </Button>
            <p className="text-xs text-[var(--muted)]">Takes about 10 minutes · You can save and return at any time</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
