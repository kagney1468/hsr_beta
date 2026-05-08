import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'

interface Props {
  propertyId: string
  prefillName: string
  prefillEmail: string
  prefillCompany: string
  onSuccess: () => void
  onClose: () => void
}

const inputClass = 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40'
const labelClass = 'block text-sm font-semibold text-[var(--teal-900)] mb-1.5'
const errorClass = 'text-xs text-red-600 mt-1'

export function RequestLpe1Modal({ propertyId, prefillName, prefillEmail, prefillCompany, onSuccess, onClose }: Props) {
  const [agentName, setAgentName]       = useState(prefillName)
  const [agentEmail, setAgentEmail]     = useState(prefillEmail)
  const [agentCompany, setAgentCompany] = useState(prefillCompany)
  const [submitting, setSubmitting]     = useState(false)
  const [errors, setErrors]             = useState<{ name?: string; email?: string }>({})
  const [apiError, setApiError]         = useState('')

  const validate = () => {
    const e: { name?: string; email?: string } = {}
    if (!agentName.trim()) e.name = 'Managing agent name is required.'
    if (!agentEmail.trim()) {
      e.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail.trim())) {
      e.email = 'Please enter a valid email address.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setApiError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lpe1-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            property_id: propertyId,
            agent_name: agentName.trim(),
            agent_email: agentEmail.trim().toLowerCase(),
            agent_company: agentCompany.trim() || null,
          }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')

      onSuccess()
    } catch (err: any) {
      setApiError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#17afaf]">Leasehold Pack</p>
          <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">Request LPE1 Information</h2>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            We'll send the managing agent a secure link to complete the LPE1 form. No account is needed on their end.
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Managing agent name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              value={agentName}
              onChange={e => { setAgentName(e.target.value); setErrors(v => ({ ...v, name: undefined })) }}
              placeholder="e.g. Jane Smith"
              disabled={submitting}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          <div>
            <label className={labelClass}>
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={inputClass}
              value={agentEmail}
              onChange={e => { setAgentEmail(e.target.value); setErrors(v => ({ ...v, email: undefined })) }}
              placeholder="e.g. jane@managingagents.co.uk"
              disabled={submitting}
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>

          <div>
            <label className={labelClass}>Company name <span className="text-[var(--muted)] font-normal">(optional)</span></label>
            <input
              type="text"
              className={inputClass}
              value={agentCompany}
              onChange={e => setAgentCompany(e.target.value)}
              placeholder="e.g. Citywide Property Management"
              disabled={submitting}
            />
          </div>
        </div>

        {apiError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="flex-1">
            {submitting ? 'Sending…' : 'Send request'}
            {!submitting && <span className="material-symbols-outlined text-base ml-1">send</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}
