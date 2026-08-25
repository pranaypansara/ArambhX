import pool from '../config/db.js';
import StudentRepository from '../repositories/student.repository.js';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type SyncRow = {
  rowNumber: number;
  enrollmentNumber: string;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  semester?: number | null;
  present: Set<string>;
  raw: Record<string, string>;
};

export type RowResult = {
  rowNumber: number;
  enrollmentNumber: string;
  action: 'create' | 'update' | 'unchanged' | 'invalid';
  errors: string[];
  fields: Partial<Record<'enrollmentNumber' | 'name' | 'email' | 'department' | 'semester', string | number | null>>;
  existing?: any;
};

export type SyncPreview = {
  summary: { toCreate: number; toUpdate: number; unchanged: number; invalid: number; total: number };
  rows: RowResult[];
};

const ALIASES: Record<string, string> = {
  student_id: 'enrollmentNumber',
  studentid: 'enrollmentNumber',
  enrollment_no: 'enrollmentNumber',
  enrollment_number: 'enrollmentNumber',
  enrollmentnumber: 'enrollmentNumber',
  enrollment: 'enrollmentNumber',
  first_name: 'firstName',
  firstname: 'firstName',
  'first name': 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  'last name': 'lastName',
  email: 'email',
  email_address: 'email',
  emailaddress: 'email',
  phone: '_ignore',
  mobile: '_ignore',
  department: 'department',
  dept: 'department',
  semester: 'semester',
  sem: 'semester',
  name: 'name',
};

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function parseFile(buffer: Buffer, filename: string): Record<string, string>[] {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext === 'csv') {
    const content = buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    return records;
  }
  if (ext === 'xls' || ext === 'xlsx') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    return json.map((row) => {
      const out: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        out[k] = String(v ?? '').trim();
      });
      return out;
    });
  }
  throw new Error('Unsupported file type. Only CSV, XLS, XLSX are allowed.');
}

function normalizeRows(rawRows: Record<string, string>[]): { rows: SyncRow[]; errors: string[] } {
  const rows: SyncRow[] = [];
  const globalErrors: string[] = [];
  if (rawRows.length === 0) {
    globalErrors.push('File is empty or has no data rows.');
    return { rows, errors: globalErrors };
  }
  const firstKeys = Object.keys(rawRows[0] || {});
  const normalizedHeaders = firstKeys.map((k) => ({ original: k, normalized: ALIASES[normalizeKey(k)] || normalizeKey(k) }));
  const hasEnrollment = normalizedHeaders.some((h) => h.normalized === 'enrollmentNumber');
  if (!hasEnrollment) {
    globalErrors.push('Required column missing: enrollment number (student_id / enrollment_number).');
    return { rows, errors: globalErrors };
  }
  const presentHeaders = new Set(normalizedHeaders.map((h) => h.normalized).filter((h) => h !== '_ignore'));

  rawRows.forEach((raw, idx) => {
    const mapped: Record<string, string> = {};
    Object.entries(raw).forEach(([k, v]) => {
      const norm = ALIASES[normalizeKey(k)] || normalizeKey(k);
      if (norm === '_ignore') return;
      mapped[norm] = String(v ?? '').trim();
    });

    const present = new Set<string>();
    presentHeaders.forEach((h) => {
      if (h === 'firstName' || h === 'lastName') {
        if (h in mapped) present.add(h);
        if (mapped.firstName != null || mapped.lastName != null) present.add('name');
      } else {
        if (h in mapped) present.add(h);
        else if (h === 'enrollmentNumber' && mapped.enrollmentNumber != null) present.add(h);
      }
    });
    if (mapped.firstName != null || mapped.lastName != null) present.add('name');

    let enrollmentNumber = mapped.enrollmentNumber || '';
    let name: string | null | undefined = undefined;
    const firstName = mapped.firstName || null;
    const lastName = mapped.lastName || null;
    if (present.has('name')) {
      if (mapped.name != null && mapped.name !== '') name = mapped.name.trim();
      else if (firstName || lastName) name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
      else name = mapped.name != null ? (mapped.name.trim() === '' ? null : mapped.name.trim()) : null;
      if (!present.has('name') && (firstName || lastName)) name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
    }

    let email: string | null | undefined = undefined;
    if (present.has('email')) {
      email = mapped.email != null && mapped.email !== '' ? mapped.email.trim() : null;
    }

    let department: string | null | undefined = undefined;
    if (present.has('department')) {
      department = mapped.department != null && mapped.department !== '' ? mapped.department.trim() : null;
    }

    let semester: number | null | undefined = undefined;
    if (present.has('semester')) {
      if (mapped.semester != null && String(mapped.semester).trim() !== '') {
        const n = Number(String(mapped.semester).trim());
        semester = Number.isNaN(n) ? null : n;
      } else {
        semester = null;
      }
    }

    const rawForRow = raw;
    rows.push({
      rowNumber: idx + 2,
      enrollmentNumber: enrollmentNumber.trim(),
      name,
      email,
      department,
      semester,
      present,
      raw: rawForRow,
    });
  });

  return { rows, errors: globalErrors };
}

function validateEmail(email: string | null | undefined): boolean {
  if (email == null || email === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function buildPreview(buffer: Buffer, filename: string): Promise<SyncPreview> {
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseFile(buffer, filename);
  } catch (e: any) {
    return {
      summary: { toCreate: 0, toUpdate: 0, unchanged: 0, invalid: 1, total: 0 },
      rows: [{ rowNumber: 1, enrollmentNumber: '', action: 'invalid', errors: [e.message || 'Failed to parse file.'], fields: {}, existing: null }],
    };
  }

  const { rows, errors: globalErrors } = normalizeRows(rawRows);
  if (globalErrors.length > 0) {
    return {
      summary: { toCreate: 0, toUpdate: 0, unchanged: 0, invalid: rows.length || 1, total: rows.length },
      rows: rows.length
        ? rows.map((r) => ({ rowNumber: r.rowNumber, enrollmentNumber: r.enrollmentNumber, action: 'invalid' as const, errors: [...globalErrors], fields: r, existing: null }))
        : [{ rowNumber: 1, enrollmentNumber: '', action: 'invalid' as const, errors: [...globalErrors], fields: {}, existing: null }],
    };
  }

  const enrollmentCount = new Map<string, number[]>();
  rows.forEach((r) => {
    const key = r.enrollmentNumber.toLowerCase();
    if (!enrollmentCount.has(key)) enrollmentCount.set(key, []);
    enrollmentCount.get(key)!.push(r.rowNumber);
  });

  const emailCount = new Map<string, number[]>();
  rows.forEach((r) => {
    if (r.email) {
      const key = r.email.toLowerCase();
      if (!emailCount.has(key)) emailCount.set(key, []);
      emailCount.get(key)!.push(r.rowNumber);
    }
  });

  const results: RowResult[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let unchanged = 0;
  let invalid = 0;

  for (const row of rows) {
    const errors: string[] = [];
    const fields: RowResult['fields'] = {};

    if (!row.enrollmentNumber || row.enrollmentNumber.trim() === '') {
      errors.push('enrollment number is required.');
    }

    const dupRows = enrollmentCount.get(row.enrollmentNumber.toLowerCase()) || [];
    if (dupRows.length > 1) {
      errors.push(`duplicate enrollment number within file (rows: ${dupRows.join(', ')}).`);
    }

    if (row.email && !validateEmail(row.email)) {
      errors.push(`invalid email: ${row.email}`);
    }

    if (row.email) {
      const dupEmailRows = emailCount.get(row.email.toLowerCase()) || [];
      if (dupEmailRows.length > 1) {
        errors.push(`duplicate email within file (rows: ${dupEmailRows.join(', ')}).`);
      }
    }

    if (row.semester != null) {
      if (!Number.isInteger(row.semester) || row.semester <= 0) {
        errors.push(`semester must be a positive integer (got: ${row.raw[Object.keys(row.raw).find((k) => normalizeKey(k) === 'semester' || ALIASES[normalizeKey(k)] === 'semester') || 'semester']}).`);
      }
    }

    const hasAtLeastOneField = row.present.has('name') || row.present.has('email') || row.present.has('department') || row.present.has('semester');

    let existing: any = null;
    if (row.enrollmentNumber) {
      try {
        const found = await StudentRepository.findByEnrollmentNumber(row.enrollmentNumber);
        if (found) {
          const full = await StudentRepository.findById(found.id);
          existing = full;
        }
      } catch {}
    }

    if (!existing) {
      if (!row.present.has('name') || row.name == null || row.name === '') errors.push('name is required for new student.');
      if (!row.present.has('department') || row.department == null || row.department === '') errors.push('department is required for new student.');
      if (!row.present.has('semester') || row.semester == null) errors.push('semester is required for new student.');
    }

    if (row.present.has('email') && row.email) {
      if (existing) {
        try {
          const emailOwner = await StudentRepository.findByEmail(row.email);
          if (emailOwner && emailOwner.id !== existing.id) {
            errors.push(`email already exists for another student (id: ${emailOwner.id}).`);
          }
        } catch {}
      } else {
        try {
          const emailOwner = await StudentRepository.findByEmail(row.email);
          if (emailOwner) {
            errors.push(`email already exists (id: ${emailOwner.id}).`);
          }
        } catch {}
      }
    }

    let action: RowResult['action'] = 'invalid';
    if (errors.length > 0) {
      action = 'invalid';
      invalid += 1;
    } else if (!existing) {
      action = 'create';
      toCreate += 1;
      if (row.name) fields.name = row.name;
      if (row.email !== undefined) fields.email = row.email;
      if (row.department) fields.department = row.department;
      if (row.semester != null) fields.semester = row.semester;
      fields.enrollmentNumber = row.enrollmentNumber;
    } else {
      const toUpdateFields: Record<string, any> = {};
      if (row.present.has('name') && row.name != null && row.name !== '' && row.name !== existing.name) toUpdateFields.name = row.name;
      if (row.present.has('email')) {
        const newEmail = row.email && row.email.trim() !== '' ? row.email.toLowerCase().trim() : null;
        const oldEmail = existing.email ? existing.email.toLowerCase().trim() : null;
        if (newEmail !== oldEmail) toUpdateFields.email = row.email;
      }
      if (row.present.has('department') && row.department != null && row.department !== '' && row.department !== existing.department) toUpdateFields.department = row.department;
      if (row.present.has('semester') && row.semester != null && row.semester !== existing.semester) toUpdateFields.semester = row.semester;

      if (Object.keys(toUpdateFields).length === 0) {
        action = 'unchanged';
        unchanged += 1;
      } else {
        action = 'update';
        toUpdate += 1;
        Object.assign(fields, toUpdateFields);
        fields.enrollmentNumber = row.enrollmentNumber;
      }
    }

    results.push({
      rowNumber: row.rowNumber,
      enrollmentNumber: row.enrollmentNumber,
      action,
      errors,
      fields,
      existing: existing
        ? { id: existing.id, enrollmentNumber: existing.enrollmentNumber, name: existing.name, email: existing.email, department: existing.department, semester: existing.semester }
        : null,
    });
  }

  return {
    summary: { toCreate, toUpdate, unchanged, invalid, total: rows.length },
    rows: results,
  };
}

export async function commitSync(buffer: Buffer, filename: string): Promise<SyncPreview & { committed: boolean }> {
  const preview = await buildPreview(buffer, filename);
  const invalidRows = preview.rows.filter((r) => r.action === 'invalid');
  if (invalidRows.length > 0) {
    return { ...preview, committed: false };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of preview.rows) {
      if (row.action === 'create') {
        const payload: any = {
          enrollmentNumber: row.enrollmentNumber,
          name: row.fields.name as string,
          email: (row.fields.email as string) ?? null,
          department: row.fields.department as string,
          semester: row.fields.semester as number,
        };
        const emailVal = payload.email && payload.email.trim() !== '' ? payload.email.toLowerCase().trim() : null;
        await client.query(
          `INSERT INTO students (enrollment_number, name, email, department, semester) VALUES ($1,$2,$3,$4,$5)`,
          [payload.enrollmentNumber.trim(), payload.name.trim(), emailVal, payload.department.trim(), payload.semester]
        );
      } else if (row.action === 'update') {
        const existingId = row.existing?.id;
        if (!existingId) throw new Error(`Missing existing id for update row ${row.rowNumber}`);
        const fields: Record<string, any> = {};
        if (row.fields.name != null) fields.name = row.fields.name;
        if (row.fields.email !== undefined) fields.email = row.fields.email;
        if (row.fields.department != null) fields.department = row.fields.department;
        if (row.fields.semester != null) fields.semester = row.fields.semester;

        const keys = Object.keys(fields) as Array<keyof typeof fields>;
        if (keys.length === 0) continue;

        const allowed: Record<string, string> = {
          name: 'name',
          email: 'email',
          department: 'department',
          semester: 'semester',
        };
        const setClause: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const k of keys) {
          if (allowed[k] !== undefined) {
            setClause.push(`${allowed[k]} = $${idx}`);
            let v = fields[k];
            if (k === 'email') v = v && typeof v === 'string' && v.trim() !== '' ? v.toLowerCase().trim() : null;
            else if (typeof v === 'string') v = v.trim();
            values.push(v);
            idx += 1;
          }
        }
        if (setClause.length === 0) continue;
        setClause.push('updated_at = CURRENT_TIMESTAMP');
        values.push(existingId);
        await client.query(`UPDATE students SET ${setClause.join(', ')} WHERE id = $${idx}`, values);
      }
    }
    await client.query('COMMIT');
    return { ...preview, committed: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
