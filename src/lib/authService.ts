import { supabase } from '@/integrations/supabase/client';
import { db } from '@/services/db';
import type { Dentist } from '@/types';

/** Pull all dentists from Supabase and refresh the local cache. */
export const pullDentistsFromSupabase = async (): Promise<Dentist[]> => {
  if (!navigator.onLine) {
    return db.dentists.orderBy('last_name').toArray();
  }

  const { data, error } = await supabase
    .from('dentists')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Failed to pull dentists from Supabase:', error);
    return db.dentists.orderBy('last_name').toArray();
  }

  const dentists = (data ?? []) as Dentist[];
  if (dentists.length > 0) {
    await db.dentists.bulkPut(dentists);
  }

  return dentists;
};

export const findDentistForLogin = async (username: string): Promise<Dentist | undefined> => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return undefined;

  if (navigator.onLine) {
    const dentists = await pullDentistsFromSupabase();
    return dentists.find(
      (dentist) => dentist.username?.toLowerCase() === normalizedUsername
    );
  }

  return db.dentists
    .filter((dentist) => dentist.username?.toLowerCase() === normalizedUsername)
    .first();
};
