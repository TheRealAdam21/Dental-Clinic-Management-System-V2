import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/services/db';

type Row = Record<string, unknown>;

const { serverState } = vi.hoisted(() => ({
  serverState: {
    rows: {} as Record<string, Row[]>,
    failWrites: false,
    // When set, writes are validated like PostgREST does and rejected with
    // PGRST204 if the payload contains a column the table does not have.
    columns: null as Record<string, string[]> | null,
  },
}));

/**
 * Minimal stand-in for the Supabase query builder: enough of the chain used by
 * the sync service to verify what actually gets sent, and to simulate a
 * network/PostgREST failure.
 */
const makeBuilder = (table: string) => {
  const state: {
    op?: 'select' | 'insert' | 'upsert' | 'update' | 'delete';
    payload?: Row | Row[];
    returning?: boolean;
    filters: Array<[string, unknown]>;
  } = { filters: [] };

  const tableRows = () => {
    serverState.rows[table] = serverState.rows[table] ?? [];
    return serverState.rows[table];
  };

  const matches = (row: Row) => state.filters.every(([column, value]) => row[column] === value);

  const resolve = () => {
    if (state.op === 'select') {
      return { data: tableRows().filter(matches).map((row) => ({ ...row })), error: null };
    }

    if (serverState.failWrites) {
      return { data: null, error: { message: 'simulated network failure', code: 'NETWORK' } };
    }

    if (serverState.columns && state.op !== 'delete' && state.op !== 'select') {
      const allowed = serverState.columns[table];
      if (allowed) {
        const rows = Array.isArray(state.payload) ? state.payload : [state.payload as Row];
        for (const row of rows) {
          const unknown = Object.keys(row ?? {}).find((key) => !allowed.includes(key));
          if (unknown) {
            return {
              data: null,
              error: {
                code: 'PGRST204',
                message: `Could not find the '${unknown}' column of '${table}' in the schema cache`,
              },
            };
          }
        }
      }
    }

    if (state.op === 'insert' || state.op === 'upsert') {
      const rows = Array.isArray(state.payload) ? state.payload : [state.payload as Row];
      for (const row of rows) {
        const existingIndex = tableRows().findIndex((candidate) => candidate.id === row.id);
        if (existingIndex >= 0) {
          tableRows()[existingIndex] = { ...tableRows()[existingIndex], ...row };
        } else {
          tableRows().push({ ...row });
        }
      }
      return { data: null, error: null };
    }

    if (state.op === 'update') {
      const updated = tableRows().filter(matches);
      for (const row of updated) {
        Object.assign(row, state.payload as Row);
      }
      return { data: state.returning ? updated.map((row) => ({ id: row.id })) : null, error: null };
    }

    if (state.op === 'delete') {
      serverState.rows[table] = tableRows().filter((row) => !matches(row));
      return { data: null, error: null };
    }

    return { data: null, error: null };
  };

  const builder: Record<string, unknown> = {
    select: () => {
      if (!state.op) state.op = 'select';
      else state.returning = true;
      return builder;
    },
    order: () => builder,
    eq: (column: string, value: unknown) => {
      state.filters.push([column, value]);
      return builder;
    },
    maybeSingle: async () => {
      const result = resolve();
      return { data: result.data?.[0] ?? null, error: result.error };
    },
    single: async () => {
      const result = resolve();
      return { data: result.data?.[0] ?? null, error: result.error };
    },
    insert: (payload: Row | Row[]) => {
      state.op = 'insert';
      state.payload = payload;
      return builder;
    },
    upsert: (payload: Row | Row[]) => {
      state.op = 'upsert';
      state.payload = payload;
      return builder;
    },
    update: (payload: Row) => {
      state.op = 'update';
      state.payload = payload;
      return builder;
    },
    delete: () => {
      state.op = 'delete';
      return builder;
    },
    then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resolve()).then(onFulfilled, onRejected),
  };

  return builder;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
}));

import { syncService } from '@/services/syncService';

const setOnline = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: online, writable: true, configurable: true });
};

const makeAppointment = (id: string) => ({
  id,
  patient_id: 'patient-1',
  dentist_id: 'dentist-1',
  appointment_datetime: '2026-11-02T09:30:00',
  service_type: 'Cleaning',
  status: 'pending',
});

describe('syncService offline queue', () => {
  beforeEach(async () => {
    serverState.rows = {};
    serverState.failWrites = false;
    serverState.columns = null;
    setOnline(false);
    await Promise.all([
      db.patients.clear(),
      db.dentists.clear(),
      db.appointments.clear(),
      db.visits.clear(),
      db.payments.clear(),
      db.medicalHistory.clear(),
      db.syncQueue.clear(),
      db.appState.clear(),
    ]);
    await db.appState.put({ id: 1, isOnline: false, syncInProgress: false });
  });

  it('counts queued offline changes (the boolean index used to hide them)', async () => {
    await syncService.addToSyncQueue('appointments', 'insert', makeAppointment('appt-1'));

    await expect(syncService.getPendingSyncCount()).resolves.toBe(1);

    const queued = await db.syncQueue.toArray();
    expect(queued[0].synced).toBe(0);
    expect(typeof queued[0].synced).toBe('number');
  });

  it('coalesces a create plus later edits into one queued change', async () => {
    await syncService.addToSyncQueue('appointments', 'insert', makeAppointment('appt-2'));
    await syncService.addToSyncQueue('appointments', 'update', {
      id: 'appt-2',
      status: 'approved',
    });
    await syncService.addToSyncQueue('appointments', 'update', {
      id: 'appt-2',
      notes: 'Bring insurance card',
    });

    const queued = await db.syncQueue.toArray();
    expect(queued).toHaveLength(1);
    expect(queued[0].operation).toBe('insert');
    expect(queued[0].data).toMatchObject({
      id: 'appt-2',
      status: 'approved',
      notes: 'Bring insurance card',
      service_type: 'Cleaning',
    });
  });

  it('flushes queued changes to Supabase and empties the queue', async () => {
    await syncService.addToSyncQueue('appointments', 'insert', makeAppointment('appt-3'));
    setOnline(true);

    const result = await syncService.flush();

    expect(result.pending).toBe(0);
    expect(serverState.rows.appointments).toEqual([
      expect.objectContaining({ id: 'appt-3', status: 'pending' }),
    ]);
    await expect(db.syncQueue.count()).resolves.toBe(0);
  });

  it('strips columns Supabase does not have before sending', async () => {
    await syncService.addToSyncQueue('visits', 'insert', {
      id: 'visit-1',
      patient_id: 'patient-1',
      visit_date: '2026-10-30',
      diagnosis: 'Cavity',
      treatment: 'Filling',
      treatment_cost: 1500,
      treatment_provided: 'Filling',
      amount_charged: 1500,
      appointment_id: 'appt-9',
    });
    setOnline(true);

    await syncService.flush();

    expect(serverState.rows.visits).toHaveLength(1);
    expect(serverState.rows.visits[0]).not.toHaveProperty('treatment_provided');
    expect(serverState.rows.visits[0]).not.toHaveProperty('amount_charged');
    expect(serverState.rows.visits[0]).not.toHaveProperty('appointment_id');
  });

  it('sends a new dentist without columns the live table does not have', async () => {
    serverState.columns = {
      dentists: [
        'id', 'username', 'first_name', 'last_name', 'specialization', 'password', 'email',
        'phone', 'created_at',
      ],
    };

    await syncService.addToSyncQueue('dentists', 'insert', {
      id: 'dentist-9',
      username: 'newdoc',
      password: 'secret123',
      first_name: 'New',
      last_name: 'Doc',
      specialization: 'Orthodontics',
      email: 'newdoc@clinic.local',
      created_at: '2026-10-30T00:00:00.000Z',
      updated_at: '2026-10-30T00:00:00.000Z',
      user_id: null,
      license_number: null,
    });
    setOnline(true);

    const result = await syncService.flush();

    expect(result.pending).toBe(0);
    expect(serverState.rows.dentists).toEqual([
      expect.objectContaining({ id: 'dentist-9', username: 'newdoc', password: 'secret123' }),
    ]);
    expect(serverState.rows.dentists[0]).not.toHaveProperty('updated_at');
    expect(serverState.rows.dentists[0]).not.toHaveProperty('user_id');
  });

  it('retries without a column the server reports as unknown', async () => {
    // Simulates schema drift: the local column list is ahead of the live table.
    serverState.columns = {
      patients: ['id', 'first_name', 'last_name', 'phone', 'created_at', 'updated_at'],
    };

    await syncService.addToSyncQueue('patients', 'insert', {
      id: 'patient-7',
      first_name: 'Ada',
      last_name: 'Reyes',
      phone: '0917',
      xray_images: ['https://example.test/xray.png'],
    });
    setOnline(true);

    const result = await syncService.flush();

    expect(result.pending).toBe(0);
    expect(serverState.rows.patients).toHaveLength(1);
    expect(serverState.rows.patients[0]).toMatchObject({ id: 'patient-7', first_name: 'Ada' });
    expect(serverState.rows.patients[0]).not.toHaveProperty('xray_images');
  });

  it('keeps un-uploaded local records when pulling server data', async () => {
    serverState.rows.patients = [
      { id: 'patient-from-server', first_name: 'Maria', last_name: 'Santos', phone: '0917' },
    ];
    serverState.failWrites = true;

    await db.patients.put({
      id: 'patient-offline',
      first_name: 'Offline',
      last_name: 'Patient',
      email: '',
      phone: '0918',
      date_of_birth: '1990-01-01',
    });
    await syncService.addToSyncQueue('patients', 'insert', {
      id: 'patient-offline',
      first_name: 'Offline',
      last_name: 'Patient',
      phone: '0918',
      date_of_birth: '1990-01-01',
    });

    setOnline(true);
    const result = await syncService.syncAll();

    expect(result.ok).toBe(false);
    await expect(db.patients.get('patient-offline')).resolves.toMatchObject({
      first_name: 'Offline',
    });
    await expect(db.patients.get('patient-from-server')).resolves.toMatchObject({
      first_name: 'Maria',
    });
    await expect(syncService.getPendingSyncCount()).resolves.toBe(1);
  });
});
