import assert from 'node:assert/strict';
import pool from '../config/db.js';
import { buildMLFeatures } from '../services/mlFeatureBuilder.service.js';
import { ML1_FEATURE_ORDER, ML1FeatureKey, ML1Features } from '../types/mlFeatures.types.js';

/**
 * Phase 4 verification: runs the Phase 3 ML Feature Builder against each demo
 * student seeded by `npm run seed:ml` and asserts the four behavioural
 * profiles produce meaningfully different, well-formed feature payloads.
 *
 * No ML model is loaded or executed here â€” this only exercises the feature
 * builder. Run with: npm run test:ml-features
 */

const DEMO_ENROLLMENTS: Record<string, string> = {
  LOW_RISK: 'SIH-ML-DEMO-LOW',
  MODERATE_RISK: 'SIH-ML-DEMO-MODERATE',
  HIGH_RISK: 'SIH-ML-DEMO-HIGH',
  EDGE_CASE: 'SIH-ML-DEMO-EDGE'
};

const NULLABLE_KEYS: ReadonlySet<string> = new Set([
  'avg_submission_date',
  'date_registration',
  'registration_early',
  'registration_late'
]);

const CATEGORICAL_KEYS: ReadonlySet<string> = new Set([
  'code_module',
  'gender',
  'region',
  'highest_education',
  'imd_band',
  'age_band',
  'disability'
]);

function cleanNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Non-finite number in feature payload: ${value}`);
  }
  return Math.round(value * 10000) / 10000;
}

function printFeatures(label: string, studentId: number, features: ML1Features): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${label} (student id ${studentId})`);
  console.log(`${'='.repeat(70)}`);
  for (const key of ML1_FEATURE_ORDER) {
    const value = features[key];
    const out = typeof value === 'number' ? cleanNumber(value) : value;
    console.log(`  ${key.padEnd(28)} ${String(out).padStart(12)}`);
  }
}

function assertPayloadSanity(features: ML1Features, label: string): void {
  // 1. Exactly the ML1 schema keys, in the exact pipeline order.
  assert.deepStrictEqual(
    Object.keys(features),
    Array.from(ML1_FEATURE_ORDER),
    `${label}: keys must match ML1 schema exactly in order`
  );

  // 2. No NaN / Infinity / undefined on required features; allowed nullables only.
  for (const key of ML1_FEATURE_ORDER) {
    const value = features[key];
    assert.ok(value !== undefined, `${label}: feature '${key}' is undefined`);
    if (value === null) {
      assert.ok(
        NULLABLE_KEYS.has(key) || CATEGORICAL_KEYS.has(key),
        `${label}: feature '${key}' is unexpectedly null`
      );
      continue;
    }
    if (typeof value === 'number') {
      assert.ok(Number.isFinite(value), `${label}: feature '${key}' is not finite (${value})`);
    } else {
      assert.ok(typeof value === 'string' && value.length > 0, `${label}: feature '${key}' has empty/odd value`);
    }
  }
}

type Features = ML1Features;

async function main(): Promise<void> {
  console.log('ðŸ§ª Verifying ML Feature Builder against seeded demo data...\n');

  const studentRows = await pool.query(
    `SELECT id, enrollment_number, name FROM students WHERE enrollment_number = ANY($1) ORDER BY enrollment_number;`,
    [Object.values(DEMO_ENROLLMENTS)]
  );
  const byEnrollment = new Map<string, { id: number; name: string }>();
  for (const row of studentRows.rows as Array<{ id: number; name: string; enrollment_number: string }>) {
    byEnrollment.set(row.enrollment_number, { id: row.id, name: row.name });
  }

  for (const enrollment of Object.values(DEMO_ENROLLMENTS)) {
    assert.ok(byEnrollment.has(enrollment), `Demo student '${enrollment}' missing â€” run 'npm run seed:ml' first`);
  }

  const result: Record<string, Features> = {};
  for (const [label, enrollment] of Object.entries(DEMO_ENROLLMENTS)) {
    const student = byEnrollment.get(enrollment)!;
    const features = await buildMLFeatures(student.id);
    assert.ok(features !== null, `${label}: buildMLFeatures returned null for seeded student ${student.id}`);
    assertPayloadSanity(features, label);
    printFeatures(label, student.id, features);
    result[label] = features;
  }

  // 3. Meaningful behavioural separation across the non-edge profiles.
  const low = result.LOW_RISK;
  const mod = result.MODERATE_RISK;
  const high = result.HIGH_RISK;
  const edge = result.EDGE_CASE;

  console.log('\nðŸ Profile separation assertions:');
  const checks: Array<[string, boolean]> = [
    [`LOW avg_assessment_score ${low.avg_assessment_score} > MODERATE ${mod.avg_assessment_score} > HIGH ${high.avg_assessment_score}`,
      low.avg_assessment_score as number > (mod.avg_assessment_score as number) && (mod.avg_assessment_score as number) > (high.avg_assessment_score as number)],
    [`LOW total_clicks ${low.total_clicks} > MODERATE ${mod.total_clicks} > HIGH ${high.total_clicks}`,
      low.total_clicks as number > (mod.total_clicks as number) && (mod.total_clicks as number) > (high.total_clicks as number)],
    [`LOW active_days ${low.active_days} > MODERATE ${mod.active_days} > HIGH ${high.active_days}`,
      low.active_days as number > (mod.active_days as number) && (mod.active_days as number) > (high.active_days as number)],
    [`LOW assessments_missed ${low.assessments_missed} < MODERATE ${mod.assessments_missed} < HIGH ${high.assessments_missed}`,
      (low.assessments_missed as number) < (mod.assessments_missed as number) && (mod.assessments_missed as number) < (high.assessments_missed as number)],
    [`LOW late_submission_count ${low.late_submission_count} < HIGH ${high.late_submission_count}`,
      (low.late_submission_count as number) < (high.late_submission_count as number)],
    [`LOW weighted_performance ${low.weighted_performance} > HIGH ${high.weighted_performance}`,
      low.weighted_performance as number > (high.weighted_performance as number)]
  ];

  for (const [description, ok] of checks) {
    console.log(`  ${ok ? 'âœ…' : 'âŒ'} ${description}`);
    assert.ok(ok, description);
  }

  // 4. EDGE CASE: valid record, no activity, must not crash and yields zeros.
  assert.equal(edge.assessments_due, 0, 'EDGE: assessments_due should be 0');
  assert.equal(edge.assessments_attempted, 0, 'EDGE: assessments_attempted should be 0');
  assert.equal(edge.total_clicks, 0, 'EDGE: total_clicks should be 0');
  assert.equal(edge.active_days, 0, 'EDGE: active_days should be 0');
  assert.equal(edge.avg_assessment_score, 0, 'EDGE: avg_assessment_score should be 0');
  assert.equal(edge.code_module, 'Unknown', 'EDGE: code_module should fall back to "Unknown"');

  console.log('\nâœ… Profile separation verified.');
  console.log('âœ… All Phase 4 ML feature checks PASSED.');
  console.log(`${'='.repeat(70)}`);
}

main()
  .catch((err: unknown) => {
    console.error('\nâŒ TEST FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });