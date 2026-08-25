import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import pool from './src/config/db.js';
import { buildPreview, commitSync } from './src/services/studentSync.service.js';
import StudentRepository from './src/repositories/student.repository.js';
import * as XLSX from 'xlsx';

const TEST_ENROLL_PREFIX = `SYNC-TEST-${Date.now()}`;

async function createCsvBuffer(rows: Record<string, string>[]): Promise<Buffer> {
  if (rows.length === 0) return Buffer.from('');
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}

function createXlsxBuffer(rows: Record<string, string>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

async function getStudentByEnroll(enroll: string) {
  const r = await pool.query('SELECT * FROM students WHERE enrollment_number = $1', [enroll]);
  return r.rows[0] || null;
}

async function cleanup(enrolls: string[]) {
  for (const e of enrolls) {
    await pool.query('DELETE FROM students WHERE enrollment_number = $1', [e]);
  }
}

async function main() {
  console.log('🧪 Student Data Sync Tests');
  let failures = 0;
  let total = 0;
  function ok(name: string, cond: boolean, extra?: string) {
    total++;
    if (cond) console.log(`  ✅ ${name}`);
    else {
      failures++;
      console.log(`  ❌ ${name}${extra ? ' -> ' + extra : ''}`);
    }
  }

  const seeded = await pool.query('SELECT enrollment_number, name, email, department, semester FROM students LIMIT 1');
  const seededStudent = seeded.rows[0];
  ok('seeded student exists', !!seededStudent, JSON.stringify(seededStudent));
  const seededEnroll = seededStudent.enrollment_number;
  const originalName = seededStudent.name;

  // Test 1: CSV preview - update existing seeded student (partial update)
  {
    const csv = await createCsvBuffer([
      { enrollment_number: seededEnroll, name: 'Updated Name Via Sync' },
    ]);
    const preview = await buildPreview(csv, 'test.csv');
    ok('preview update existing seeded student', preview.summary.toUpdate === 1 && preview.summary.invalid === 0, JSON.stringify(preview.summary));
    const row = preview.rows[0];
    ok('row action is update', row.action === 'update', row.action);
    ok('only name field in update', row.fields.name === 'Updated Name Via Sync' && row.fields.department == null, JSON.stringify(row.fields));
  }

  // Test 2: Create new student via CSV
  {
    const newEnroll = `${TEST_ENROLL_PREFIX}-NEW`;
    const csv = await createCsvBuffer([
      { enrollment_number: newEnroll, name: 'New Sync Student', email: 'newsync@test.local', department: 'Computer Science', semester: '3' },
    ]);
    const preview = await buildPreview(csv, 'test.csv');
    ok('preview create new student', preview.summary.toCreate === 1, JSON.stringify(preview.summary));
    const result = await commitSync(csv, 'test.csv');
    ok('commit create new student', result.committed === true && result.summary.toCreate === 1, JSON.stringify(result.summary));
    const created = await getStudentByEnroll(newEnroll);
    ok('new student exists in DB', !!created && created.name === 'New Sync Student', JSON.stringify(created));
    await cleanup([newEnroll]);
  }

  // Test 3: Partial field update preserves unspecified fields
  {
    const enroll = `${TEST_ENROLL_PREFIX}-PARTIAL`;
    const csvCreate = await createCsvBuffer([
      { enrollment_number: enroll, name: 'Partial Test', email: 'partial@test.local', department: 'IT', semester: '2' },
    ]);
    await commitSync(csvCreate, 'test.csv');
    const before = await getStudentByEnroll(enroll);
    const csvUpdate = await createCsvBuffer([
      { enrollment_number: enroll, department: 'Mechanical Engineering' },
    ]);
    const preview = await buildPreview(csvUpdate, 'test.csv');
    ok('partial update preview is update', preview.summary.toUpdate === 1, JSON.stringify(preview.summary));
    const result = await commitSync(csvUpdate, 'test.csv');
    ok('partial update committed', result.committed === true, JSON.stringify(result.summary));
    const after = await getStudentByEnroll(enroll);
    ok('partial update preserves name', after.name === 'Partial Test', after.name);
    ok('partial update preserves email', after.email === 'partial@test.local', after.email);
    ok('partial update changes department', after.department === 'Mechanical Engineering', after.department);
    ok('partial update preserves semester', String(after.semester) === '2', String(after.semester));
    await cleanup([enroll]);
  }

  // Test 4: Duplicate IDs within file
  {
    const dupEnroll = `${TEST_ENROLL_PREFIX}-DUP`;
    const csv = await createCsvBuffer([
      { enrollment_number: dupEnroll, name: 'Dup One', department: 'CSE', semester: '1' },
      { enrollment_number: dupEnroll, name: 'Dup Two', department: 'CSE', semester: '1' },
    ]);
    const preview = await buildPreview(csv, 'dup.csv');
    ok('duplicate detection invalid', preview.summary.invalid === 2, JSON.stringify(preview.summary));
    ok('duplicate errors reported', preview.rows.every((r) => r.errors.some((e) => e.includes('duplicate'))), JSON.stringify(preview.rows.map((r) => r.errors)));
    const result = await commitSync(csv, 'dup.csv');
    ok('duplicate commit not committed', result.committed === false, JSON.stringify(result));
    const exists = await getStudentByEnroll(dupEnroll);
    ok('duplicate does not create student', !exists, JSON.stringify(exists));
  }

  // Test 5: Invalid rows (invalid email, invalid semester)
  {
    const csv = await createCsvBuffer([
      { enrollment_number: `${TEST_ENROLL_PREFIX}-BAD1`, name: 'Bad Email', email: 'not-an-email', department: 'CSE', semester: '1' },
      { enrollment_number: `${TEST_ENROLL_PREFIX}-BAD2`, name: 'Bad Sem', email: 'valid@test.local', department: 'CSE', semester: 'not-a-number' },
      { enrollment_number: '', name: 'No Enroll', department: 'CSE', semester: '1' },
    ]);
    const preview = await buildPreview(csv, 'invalid.csv');
    ok('invalid rows detected', preview.summary.invalid === 3, JSON.stringify(preview.summary));
    ok('all rows invalid', preview.rows.every((r) => r.action === 'invalid'), JSON.stringify(preview.rows.map((r) => r.action)));
    const result = await commitSync(csv, 'invalid.csv');
    ok('invalid commit not committed', result.committed === false, JSON.stringify(result));
  }

  // Test 6: Transaction rollback - one valid, one invalid should not commit valid
  {
    const validEnroll = `${TEST_ENROLL_PREFIX}-TX-VALID`;
    const csv = await createCsvBuffer([
      { enrollment_number: validEnroll, name: 'Tx Valid', department: 'CSE', semester: '1' },
      { enrollment_number: `${TEST_ENROLL_PREFIX}-TX-BAD`, name: 'Tx Bad', email: 'bad-email', department: 'CSE', semester: '1' },
    ]);
    const preview = await buildPreview(csv, 'tx.csv');
    ok('tx preview has one invalid', preview.summary.invalid === 1 && preview.summary.toCreate === 1, JSON.stringify(preview.summary));
    const result = await commitSync(csv, 'tx.csv');
    ok('tx commit not committed due to invalid', result.committed === false, JSON.stringify(result));
    const exists = await getStudentByEnroll(validEnroll);
    ok('tx rollback preserves DB (valid not created)', !exists, JSON.stringify(exists));
  }

  // Test 7: XLSX parsing
  {
    const xlsxEnroll = `${TEST_ENROLL_PREFIX}-XLSX`;
    const xlsx = createXlsxBuffer([
      { enrollment_number: xlsxEnroll, name: 'XLSX Student', department: 'IT', semester: '4' },
    ]);
    const preview = await buildPreview(xlsx, 'test.xlsx');
    ok('XLSX preview create', preview.summary.toCreate === 1, JSON.stringify(preview.summary));
    const result = await commitSync(xlsx, 'test.xlsx');
    ok('XLSX commit', result.committed === true, JSON.stringify(result));
    const exists = await getStudentByEnroll(xlsxEnroll);
    ok('XLSX student exists', !!exists, JSON.stringify(exists));
    await cleanup([xlsxEnroll]);
  }

  // Test 8: XLS parsing (using xlsx with xls extension, same handling)
  {
    const xlsEnroll = `${TEST_ENROLL_PREFIX}-XLS`;
    const xls = createXlsxBuffer([
      { enrollment_number: xlsEnroll, name: 'XLS Student', department: 'IT', semester: '5' },
    ]);
    const preview = await buildPreview(xls, 'test.xls');
    ok('XLS preview create', preview.summary.toCreate === 1, JSON.stringify(preview.summary));
    await cleanup([xlsEnroll]); // not committed, just preview
  }

  // Test 9: Unchanged records (same data as existing)
  {
    const enroll = `${TEST_ENROLL_PREFIX}-UNCHANGED`;
    const csvCreate = await createCsvBuffer([
      { enrollment_number: enroll, name: 'Unchanged Test', department: 'CSE', semester: '6' },
    ]);
    await commitSync(csvCreate, 'test.csv');
    const csvSame = await createCsvBuffer([
      { enrollment_number: enroll, name: 'Unchanged Test', department: 'CSE', semester: '6' },
    ]);
    const preview = await buildPreview(csvSame, 'test.csv');
    ok('unchanged detection', preview.summary.unchanged === 1, JSON.stringify(preview.summary));
    ok('row is unchanged', preview.rows[0].action === 'unchanged', preview.rows[0].action);
    await cleanup([enroll]);
  }

  // Test 10: Column normalization (student_id, dept, sem, email_address)
  {
    const normEnroll = `${TEST_ENROLL_PREFIX}-NORM`;
    const xlsx = createXlsxBuffer([
      { student_id: normEnroll, first_name: 'Norm', last_name: 'Test', email_address: 'norm@test.local', dept: 'ECE', sem: '7' } as any,
    ]);
    const preview = await buildPreview(xlsx, 'norm.xlsx');
    ok('column normalization create', preview.summary.toCreate === 1, JSON.stringify(preview.summary));
    const row = preview.rows[0];
    ok('normalized name from first+last', row.fields.name === 'Norm Test', JSON.stringify(row.fields));
    ok('normalized dept', row.fields.department === 'ECE', JSON.stringify(row.fields));
    ok('normalized sem', row.fields.semester === 7, JSON.stringify(row.fields));
    const result = await commitSync(xlsx, 'norm.xlsx');
    ok('normalized commit', result.committed === true, JSON.stringify(result));
    const exists = await getStudentByEnroll(normEnroll);
    ok('normalized student exists', !!exists && exists.name === 'Norm Test', JSON.stringify(exists));
    await cleanup([normEnroll]);
  }

  // Test 11: Update seeded student via sync and verify
  {
    const csv = await createCsvBuffer([
      { enrollment_number: seededEnroll, department: 'Updated Dept Via Sync' },
    ]);
    const preview = await buildPreview(csv, 'seeded.csv');
    ok('seeded update preview', preview.summary.toUpdate === 1, JSON.stringify(preview.summary));
    const result = await commitSync(csv, 'seeded.csv');
    ok('seeded update committed', result.committed === true, JSON.stringify(result));
    const after = await getStudentByEnroll(seededEnroll);
    ok('seeded student updated', after.department === 'Updated Dept Via Sync', after.department);
    // Restore original department
    await pool.query('UPDATE students SET department = $1 WHERE enrollment_number = $2', [seededStudent.department, seededEnroll]);
    const restored = await getStudentByEnroll(seededEnroll);
    ok('seeded student restored', restored.department === seededStudent.department, restored.department);
  }

  console.log(`\n--- Done: ${total - failures}/${total} passed, ${failures} failed ---`);
  await pool.end();
  if (failures > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
