import { Link } from 'react-router-dom';
import { Card } from './ui/Card';

interface Props {
  address?: string;
}

export default function AreaReportCtaCard({ address }: Props) {
  const href = address
    ? `/area-report?address=${encodeURIComponent(address)}`
    : '/area-report';

  return (
    <Card className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--teal-050)] to-white print:hidden">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[#17afaf] text-2xl shrink-0 mt-0.5">home_pin</span>
        <div>
          <h3 className="font-black font-heading text-[var(--teal-900)] text-base leading-snug">
            Know this area before you move
          </h3>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Get a free AI report on broadband, schools, crime &amp; more for this postcode.
          </p>
        </div>
      </div>
      <Link
        to={href}
        className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#17afaf] text-white text-sm font-black hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        Check Area
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </Card>
  );
}
