import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type Lpe1Status = 'requested' | 'in_progress' | 'complete'

export interface Lpe1Record {
  id: string
  status: Lpe1Status
  requested_at: string | null
  completed_at: string | null
  completed_by_name: string | null
  completed_by_company: string | null
}

export function useLpe1(propertyId: string | undefined) {
  const [lpe1, setLpe1] = useState<Lpe1Record | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)
    const { data } = await supabase
      .from('property_lpe1')
      .select('id, status, requested_at, completed_at, completed_by_name, completed_by_company')
      .eq('property_id', propertyId)
      .maybeSingle()
    setLpe1(data ?? null)
    setLoading(false)
  }, [propertyId])

  useEffect(() => { load() }, [load])

  return { lpe1, loading, reload: load }
}
