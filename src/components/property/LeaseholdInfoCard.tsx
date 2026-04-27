import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';

const checklist = [
  {
    label: 'Request your LPE1 information',
    detail: "Contact your managing agent directly — you don't need a solicitor to do this.",
  },
  {
    label: 'Get your service charge accounts',
    detail: "Ask for the current year's account and the budget for the year ahead.",
  },
  {
    label: 'Find your lease document',
    detail: "Don't have a copy? Get one from the Land Registry for £3.",
  },
  {
    label: 'Request the building insurance certificate',
    detail: 'Ask your freeholder or managing agent — buyers and solicitors will want to see this.',
  },
  {
    label: 'Check your ground rent',
    detail: "It's in your lease. If it's over £250 per year or set to increase, flag this early.",
  },
];

export default function LeaseholdInfoCard() {
  return (
    <Card className="p-6 border-l-4 border-l-[#17afaf] mt-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="material-symbols-outlined text-[#17afaf] text-2xl shrink-0 mt-0.5">description</span>
        <div>
          <h3 className="font-black font-heading text-[var(--teal-900)] text-base leading-snug">
            You're selling a leasehold property
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Good news — you can gather most of this information yourself, right now.
          </p>
        </div>
      </div>

      <ul className="space-y-4 mb-5">
        {checklist.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 size-5 rounded-full bg-[#17afaf] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[12px]">check</span>
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--teal-900)]">{item.label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] mb-4">
        <p className="text-xs text-[var(--teal-900)]">
          Getting these documents together now — before you go to market — could save weeks off your home sale.
        </p>
      </div>

      <Link to="/guides/lpe1" className="text-xs font-bold text-[#17afaf] hover:underline">
        Read the full LPE1 guide →
      </Link>
    </Card>
  );
}
