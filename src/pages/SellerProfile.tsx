import { Card } from '../components/ui/Card';
import { SectionContainer } from '../components/ui/SectionContainer';
import { Button } from '../components/ui/Button';

export default function SellerProfile() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Seller Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and identity verification.</p>
      </div>

      <Card className="p-8">
        <SectionContainer 
          title="Personal Information" 
          description="Your contact details and primary address."
        >
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person</span>
            <p className="text-slate-500 font-medium">Personal Information Form Placeholder</p>
            <p className="text-sm text-slate-400 mt-1">Fields for Name, Email, Phone, Address will go here.</p>
          </div>
        </SectionContainer>

        <SectionContainer 
          title="Identity Verification" 
          description="Upload your ID to verify your identity as the property owner."
          className="border-0"
        >
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">badge</span>
            <p className="text-slate-500 font-medium">ID Upload Component Placeholder</p>
            <p className="text-sm text-slate-400 mt-1">Integration with identity verification service will go here.</p>
          </div>
        </SectionContainer>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Save Profile</Button>
        </div>
      </Card>
    </div>
  );
}
