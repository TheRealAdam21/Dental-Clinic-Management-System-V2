import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/services/db';
import type { Dentist } from '@/types';

const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockIlike = vi.fn(() => ({ limit: mockLimit }));
const mockOrder = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import {
  findDentistForLogin,
  pullDentistsFromSupabase,
  preloadDentistAccounts,
} from '@/lib/authService';

const sampleDentist: Dentist = {
  id: 'dentist-1',
  username: 'adonis',
  password: 'secret',
  first_name: 'Adonis',
  last_name: 'Cortez',
  email: 'adonis@clinic.local',
  created_at: '2025-01-01T00:00:00.000Z',
};

describe('authService', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockLimit.mockClear();
    mockIlike.mockClear();
    mockOrder.mockReset();
    mockSelect.mockReset();

    mockSelect.mockImplementation(() => ({
      ilike: mockIlike,
      order: mockOrder,
    }));
  });

  it('findDentistForLogin returns a matching dentist from Supabase', async () => {
    mockMaybeSingle.mockResolvedValue({ data: sampleDentist, error: null });

    const dentist = await findDentistForLogin('Adonis');

    expect(dentist).toEqual(sampleDentist);
    expect(mockIlike).toHaveBeenCalledWith('username', 'adonis');
    await expect(db.dentists.get('dentist-1')).resolves.toEqual(sampleDentist);
  });

  it('findDentistForLogin returns undefined when Supabase has no match', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });

    const dentist = await findDentistForLogin('missing');

    expect(dentist).toBeUndefined();
  });

  it('pullDentistsFromSupabase caches dentists locally', async () => {
    mockOrder.mockResolvedValue({
      data: [sampleDentist],
      error: null,
    });

    const dentists = await pullDentistsFromSupabase();

    expect(dentists).toHaveLength(1);
    await expect(db.dentists.count()).resolves.toBe(1);
  });

  it('preloadDentistAccounts warms the cache without throwing', async () => {
    mockOrder.mockResolvedValue({
      data: [sampleDentist],
      error: null,
    });

    preloadDentistAccounts();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await expect(db.dentists.count()).resolves.toBe(1);
  });
});
