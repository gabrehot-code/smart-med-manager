// Data-access facade over Supabase. Screens call api.* and never touch
// supabase-js directly — the same seam the original localStorage app used,
// which is what made this migration incremental.
import { supabase } from './supabaseClient';
import { normalizeTime } from './format';

export const api = {
  profile: {
    async get() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    async update(patch) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single();
      if (error) throw error;
      return data;
    },
  },

  patients: {
    async firstForUser() {
      const { data, error } = await supabase.from('patients').select('*').order('created_at').limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    async create({ full_name, possessive_nick = 'אבא' }) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('patients')
        .insert({ caregiver_id: user.id, full_name, possessive_nick })
        .select().single();
      if (error) throw error;
      return data;
    },
    // On first login: create a default patient and seed demo medications so the
    // dashboard and core flow are demonstrable immediately.
    async ensureDefault() {
      let p = await this.firstForUser();
      if (p) return p;
      p = await this.create({ full_name: 'משה לוי', possessive_nick: 'אבא' });
      await api.meds.create(p.id, { name: 'לחץ דם', qty: 42, dose: '20 מ״ג', color: '#3B82F6', times: ['08:00', '20:00'] });
      await api.meds.create(p.id, { name: 'ויטמין D', qty: 30, dose: 'טיפות', color: '#FBBF24', times: ['14:00'] });
      await api.meds.create(p.id, { name: 'אספירין', qty: 28, dose: '100 מ״ג', color: '#EF4444', times: ['08:00'] });
      return p;
    },
    async update(id, patch) {
      const { data, error } = await supabase.from('patients').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
  },

  meds: {
    async list(patientId) {
      const { data, error } = await supabase.from('medications')
        .select('id,name,dose,color,qty,archived, medication_times(time_of_day)')
        .eq('patient_id', patientId).eq('archived', false).order('created_at');
      if (error) throw error;
      return (data || []).map((m) => ({
        ...m,
        times: (m.medication_times || []).map((t) => normalizeTime(t.time_of_day)).sort(),
      }));
    },
    async create(patientId, m) {
      const { data, error } = await supabase.from('medications')
        .insert({ patient_id: patientId, name: m.name, dose: m.dose || '', color: m.color || '#3B82F6', qty: Number(m.qty) || 0 })
        .select().single();
      if (error) throw error;
      const times = (m.times || []).map((t) => ({ medication_id: data.id, time_of_day: normalizeTime(t) }));
      if (times.length) {
        const { error: tErr } = await supabase.from('medication_times').insert(times);
        if (tErr) throw tErr;
      }
      return data;
    },
    async update(id, patch) {
      const { error } = await supabase.from('medications').update(patch).eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await supabase.from('medications').update({ archived: true }).eq('id', id);
      if (error) throw error;
    },
  },

  doses: {
    async all(patientId) {
      const { data, error } = await supabase.from('doses')
        .select('medication_id, scheduled_at, status, taken_at, medications!inner(patient_id)')
        .eq('medications.patient_id', patientId);
      if (error) throw error;
      return data || [];
    },
    async record(medicationId, scheduledAtISO, status = 'taken', takenAtISO = null) {
      const row = {
        medication_id: medicationId,
        scheduled_at: scheduledAtISO,
        status,
        taken_at: takenAtISO || (status === 'taken' ? new Date().toISOString() : null),
      };
      const { error } = await supabase.from('doses').upsert(row, { onConflict: 'medication_id,scheduled_at' });
      if (error) throw error;
      if (status === 'taken') {
        const { data: med } = await supabase.from('medications').select('qty').eq('id', medicationId).single();
        if (med && med.qty > 0) {
          await supabase.from('medications').update({ qty: med.qty - 1 }).eq('id', medicationId);
        }
      }
    },
  },

  vitals: {
    async list(patientId) {
      const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async log(patientId, entry) {
      const { error } = await supabase.from('vitals').insert({ patient_id: patientId, ...entry });
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await supabase.from('vitals').delete().eq('id', id);
      if (error) throw error;
    },
  },

  journal: {
    async list(patientId) {
      const { data, error } = await supabase.from('journal_entries').select('*, journal_symptoms(symptom)').eq('patient_id', patientId).order('recorded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async create(patientId, { body, medication_id = null, symptoms = [] }) {
      const { data, error } = await supabase.from('journal_entries').insert({ patient_id: patientId, body, medication_id }).select().single();
      if (error) throw error;
      if (symptoms.length) {
        await supabase.from('journal_symptoms').insert(symptoms.map((s) => ({ journal_id: data.id, symptom: s })));
      }
      return data;
    },
    async remove(id) {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
    },
  },

  mood: {
    async today(patientId) {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from('mood_logs').select('*').eq('patient_id', patientId).eq('log_date', today).maybeSingle();
      if (error) throw error;
      return data;
    },
    async set(patientId, mood, label) {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('mood_logs').upsert(
        { patient_id: patientId, log_date: today, mood, label },
        { onConflict: 'patient_id,log_date' },
      );
      if (error) throw error;
    },
  },

  contacts: {
    async list(patientId) {
      const { data, error } = await supabase.from('contacts').select('*').eq('patient_id', patientId);
      if (error) throw error;
      return data || [];
    },
    // One contact per type (emergency / doctor) — upsert by replacing.
    async save(patientId, type, fields) {
      const existing = (await this.list(patientId)).find((c) => c.type === type);
      if (existing) {
        const { error } = await supabase.from('contacts').update(fields).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert({ patient_id: patientId, type, ...fields });
        if (error) throw error;
      }
    },
  },

  ai: {
    // Calls the secure Edge Function (key stays server-side).
    async ask({ system, messages, max_tokens = 1024 }) {
      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: { system, messages, max_tokens },
      });
      if (error) throw error;
      return data?.text || '';
    },
  },
};
