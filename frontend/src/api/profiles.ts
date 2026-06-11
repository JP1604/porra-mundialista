import { supabase } from '@/lib/supabase'

export const profilesApi = {
  getById: async (userId: string): Promise<{ id: string; alias: string } | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('id, alias')
      .eq('id', userId)
      .maybeSingle()
    return data
  },
}
