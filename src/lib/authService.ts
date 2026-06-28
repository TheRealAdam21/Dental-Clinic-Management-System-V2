import { supabase } from '@/integrations/supabase/client';
import { db } from '@/services/db';
import type { Dentist } from '@/types';

export const findDentistForLogin = async (username: string): Promise<Dentist | undefined> => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return undefined;

  const localMatch = await db.dentists
    .filter((dentist) => dentist.username?.toLowerCase() === normalizedUsername)
    .first();

  if (localMatch) return localMatch;

  if (!navigator.onLine) return undefined;

  try {
    const { data, error } = await supabase.from('dentists').select('*');

    if (error) {
      console.error('Failed to fetch dentist for login:', error);
      return undefined;
    }

    const remoteMatch = (data ?? []).find(
      (dentist) => (dentist as Dentist).username?.toLowerCase() === normalizedUsername
    ) as Dentist | undefined;

    if (!remoteMatch) return undefined;

    await db.dentists.put(remoteMatch);
    return remoteMatch;
  } catch (error) {
    console.error('Dentist login lookup failed:', error);
    return undefined;
  }
};

export const cacheDentistsFromServer = async (): Promise<void> => {
  if (!navigator.onLine) return;

  try {
    const { data, error } = await supabase
      .from('dentists')
      .select('*')
      .order('last_name', { ascending: true });

    if (error || !data?.length) return;

    await db.dentists.bulkPut(data as Dentist[]);
  } catch (error) {
    console.error('Failed to cache dentists from server:', error);
  }
};
