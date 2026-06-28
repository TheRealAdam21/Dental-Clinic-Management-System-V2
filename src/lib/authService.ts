import { supabase } from '@/integrations/supabase/client';
import { db } from '@/services/db';
import type { Dentist } from '@/types';

const cacheDentists = async (dentists: Dentist[]): Promise<void> => {
  await db.dentists.clear();
  if (dentists.length > 0) {
    await db.dentists.bulkPut(dentists);
  }
};

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
  await cacheDentists(dentists);
  return dentists;
};

export const findDentistForLogin = async (username: string): Promise<Dentist | undefined> => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return undefined;

  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('dentists')
      .select('*')
      .ilike('username', normalizedUsername)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const dentist = data as Dentist;
      await db.dentists.put(dentist);
      return dentist;
    }

    if (error) {
      console.error('Failed to look up dentist for login:', error);
    }

    const dentists = await pullDentistsFromSupabase();
    return dentists.find(
      (dentist) => dentist.username?.toLowerCase() === normalizedUsername
    );
  }

  return db.dentists
    .filter((dentist) => dentist.username?.toLowerCase() === normalizedUsername)
    .first();
};

/** Warm the local dentist cache in the background (non-blocking). */
export const preloadDentistAccounts = (): void => {
  void pullDentistsFromSupabase().catch((error) => {
    console.error('Background dentist preload failed:', error);
  });
};
