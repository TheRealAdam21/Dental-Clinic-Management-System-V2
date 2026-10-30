import { supabase } from '@/integrations/supabase/client';
import { db } from '@/services/db';
import type { Dentist } from '@/types';

const cacheDentists = async (dentists: Dentist[]): Promise<void> => {
  await db.dentists.clear();
  if (dentists.length > 0) {
    await db.dentists.bulkPut(dentists);
  }
};

const findInCache = (username: string): Promise<Dentist | undefined> =>
  db.dentists
    .filter((dentist) => dentist.username?.toLowerCase() === username)
    .first();

/**
 * Pull all dentists from Supabase and refresh the local cache.
 *
 * This deliberately attempts the request even when `navigator.onLine` is false:
 * the flag is unreliable inside the desktop webview and a false negative used to
 * lock legitimately online users out of the app.
 */
export const pullDentistsFromSupabase = async (): Promise<Dentist[]> => {
  try {
    const { data, error } = await supabase
      .from('dentists')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) throw error;

    const dentists = (data ?? []) as unknown as Dentist[];
    await cacheDentists(dentists);
    return dentists;
  } catch (error) {
    console.error('Failed to pull dentists from Supabase:', error);
    return db.dentists.orderBy('last_name').toArray();
  }
};

/**
 * Looks an account up on the server first, then falls back to the local cache so
 * a dentist created while offline can still sign in on the device that holds it.
 */
export const findDentistForLogin = async (username: string): Promise<Dentist | undefined> => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return undefined;

  try {
    const { data, error } = await supabase
      .from('dentists')
      .select('*')
      .ilike('username', normalizedUsername)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const dentist = data as unknown as Dentist;
      await db.dentists.put(dentist);
      return dentist;
    }
  } catch (error) {
    console.error('Failed to look up dentist for login:', error);
  }

  return findInCache(normalizedUsername);
};

/** Warm the local dentist cache in the background (non-blocking). */
export const preloadDentistAccounts = (): void => {
  void pullDentistsFromSupabase().catch((error) => {
    console.error('Background dentist preload failed:', error);
  });
};
