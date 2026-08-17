import check from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting end-to-end API test with dummy data...\n');

  let adminToken = '';
  let studentId = null;

  // 1. Register ADMIN user (fails gracefully if duplicate/already exists)
  console.log('1. Registering ADMIN user...');
  const regResponse = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Tester',
      email: 'tester@example.com',
      password: 'password123',
      role: 'ADMIN'
    })
  });
  const regResult = await regResponse.json();
  if (regResponse.status === 201) {
    console.log('✅ ADMIN registered successfully!');
  } else if (regResponse.status === 400 && regResult.message.includes('already exists')) {
    console.log('ℹ️ ADMIN already exists. Proceeding to login...');
  } else {
    throw new Error(`Registration failed: ${JSON.stringify(regResult)}`);
  }

  // 2. Login to get JWT Token
  console.log('\n2. Logging in as ADMIN...');
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'tester@example.com',
      password: 'password123'
    })
  });
  const loginResult = await loginResponse.json();
  check.strictEqual(loginResponse.status, 200, 'Login should succeed');
  adminToken = loginResult.token;
  console.log('✅ Login successful! Token acquired.');

  // 3. Create Student profile
  console.log('\n3. Creating a new student profile...');
  const uniqueEnrollment = `IT_TEST_${Date.now()}`;
  const studentPayload = {
    enrollmentNumber: uniqueEnrollment,
    name: 'Aarav Sharma',
    email: `aarav.${Date.now()}@example.com`,
    department: 'Information Technology',
    semester: 4
  };
  const createStudentResponse = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(studentPayload)
  });
  const createStudentResult = await createStudentResponse.json();
  check.strictEqual(createStudentResponse.status, 201, 'Student creation should succeed');
  studentId = createStudentResult.data.id;
  console.log(`✅ Student created successfully! Database ID: ${studentId}`);

  // 4. Test duplicate constraint check
  console.log('\n4. Verifying duplicate enrollment number validation...');
  const duplicateResponse = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(studentPayload)
  });
  const duplicateResult = await duplicateResponse.json();
  check.strictEqual(duplicateResponse.status, 400, 'Duplicate request should be rejected');
  check.strictEqual(duplicateResult.success, false);
  console.log(`✅ Correctly rejected duplicate registration: "${duplicateResult.message}"`);

  // 5. Create multiple attendance records
  console.log('\n5. Creating historical attendance records...');
  // Record 1: January (78%)
  const attResponse1 = await fetch(`${BASE_URL}/students/${studentId}/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      attendancePercentage: 78.0,
      recordedAt: '2026-01-10T10:00:00.000Z'
    })
  });
  check.strictEqual(attResponse1.status, 201);

  // Record 2: February (latest - 65.5%)
  const attResponse2 = await fetch(`${BASE_URL}/students/${studentId}/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      attendancePercentage: 65.5,
      recordedAt: '2026-02-10T10:00:00.000Z'
    })
  });
  check.strictEqual(attResponse2.status, 201);
  console.log('✅ Two historical attendance records created successfully!');

  // 6. Create multiple academic records
  console.log('\n6. Creating historical academic records...');
  // Record 1: January
  const acadResponse1 = await fetch(`${BASE_URL}/students/${studentId}/academic-records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      averageMarks: 72.0,
      backlogCount: 0,
      assignmentCompletion: 90.0,
      lmsActivity: 82.0,
      recordedAt: '2026-01-10T10:00:00.000Z'
    })
  });
  check.strictEqual(acadResponse1.status, 201);

  // Record 2: February (latest)
  const acadResponse2 = await fetch(`${BASE_URL}/students/${studentId}/academic-records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      averageMarks: 58.4,
      backlogCount: 2,
      assignmentCompletion: 60.0,
      lmsActivity: 45.0,
      recordedAt: '2026-02-10T10:00:00.000Z'
    })
  });
  check.strictEqual(acadResponse2.status, 201);
  console.log('✅ Two historical academic records created successfully!');

  // 7. Get Student Summary (should pull latest from Feb 10)
  console.log('\n7. Fetching student summary...');
  const summaryResponse = await fetch(`${BASE_URL}/students/${studentId}/summary`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const summaryResult = await summaryResponse.json();
  check.strictEqual(summaryResponse.status, 200);
  
  const { student, latestAttendance, latestAcademicRecord } = summaryResult.data;
  console.log('✅ Summary fetched successfully!');
  console.log(`👨‍🎓 Student: ${student.name} (${student.enrollmentNumber})`);
  console.log(`📈 Latest Attendance: ${latestAttendance.attendancePercentage}% (recorded: ${latestAttendance.recordedAt})`);
  console.log(`📚 Latest Academics: ${latestAcademicRecord.averageMarks} marks, ${latestAcademicRecord.backlogCount} backlogs (recorded: ${latestAcademicRecord.recordedAt})`);

  // Verify that it selected the latest (February) values
  check.strictEqual(parseFloat(latestAttendance.attendancePercentage), 65.5, 'Should select latest attendance');
  check.strictEqual(parseFloat(latestAcademicRecord.averageMarks), 58.4, 'Should select latest average marks');
  check.strictEqual(latestAcademicRecord.backlogCount, 2, 'Should select latest backlog count');

  // 8. Delete student and verify cascade
  console.log('\n8. Deleting student profile (testing cascading delete)...');
  const deleteResponse = await fetch(`${BASE_URL}/students/${studentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  check.strictEqual(deleteResponse.status, 200);
  console.log('✅ Student deleted successfully!');

  // 9. Verify subsequent lookup yields 404
  console.log('\n9. Verifying student records are removed...');
  const verifyResponse = await fetch(`${BASE_URL}/students/${studentId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  check.strictEqual(verifyResponse.status, 404);
  console.log('✅ Lookup correctly returned 404 Student Not Found.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The raw-SQL backend flow is completely verified.');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
