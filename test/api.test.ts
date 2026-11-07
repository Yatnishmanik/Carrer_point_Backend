import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import type { Server } from 'node:http';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { generateToken } from '../src/utils/jwt';
import { gradeAttempt } from '../src/utils/grading';

// Never run integration fixtures against an application database.
const db = new URL(process.env.DATABASE_URL!);
assert.equal(process.env.NODE_ENV, 'test');
assert.match(db.pathname, /test/i);
assert.ok(['localhost', '127.0.0.1'].includes(db.hostname));

let server: Server;
let base: string;
let studentId: string;
let studentToken: string;
let adminToken: string;
let adminId: string;
let testId: string;
let hiddenTestId: string;
let thresholdTestId: string;
let managedTestId: string;
let managedCategoryId: string;
let questionId: string;
let correctOptionId: string;
let attemptId: string;
const email = `review-${Date.now()}@example.com`;
const username = `student_${Date.now()}`;
const password = 'test-password-12345';

async function request(path: string, token?: string, body?: unknown, method?: string) {
  const response = await fetch(`${base}/api${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
  const admin = await prisma.user.create({ data: { name: 'Test Admin', email: `admin-${email}`, password: await bcrypt.hash(password, 10), role: 'ADMIN' } });
  adminId = admin.id;
  adminToken = generateToken({ userId: admin.id, email: admin.email, role: 'ADMIN' });
  const test = await prisma.test.create({ data: { title: 'Integration Test', categoryName: 'Science', durationMinutes: 1 } });
  testId = test.id;
  const hidden = await prisma.test.create({ data: { title: 'Draft', categoryName: 'Science', isPublished: false } });
  hiddenTestId = hidden.id;
});

after(async () => {
  const testIds = [testId, hiddenTestId, thresholdTestId, managedTestId].filter((id): id is string => Boolean(id));
  if (testIds.length) await prisma.test.deleteMany({ where: { id: { in: testIds } } });
  if (managedCategoryId) await prisma.examCategory.deleteMany({ where: { id: managedCategoryId } });
  await prisma.user.deleteMany({ where: { email: { in: [email, `admin-${email}`] } } });
  await prisma.$disconnect();
  if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
});

describe('Authentication, authorization and test integrity', () => {
  it('cannot register an administrator through public registration', async () => {
    const r = await request('/auth/register', undefined, { username, email, password, role: 'ADMIN' });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.user.role, 'STUDENT');
    studentToken = r.body.data.token;
    studentId = r.body.data.user.id;
    assert.equal((await request('/questions', studentToken)).status, 403);
  });

  it('checks availability and signs in with a case-insensitive username or email', async () => {
    const taken = await request(`/auth/availability?username=${username.toUpperCase()}`);
    assert.equal(taken.status, 200);
    assert.equal(taken.body.data.available, false);
    assert.equal((await request(`/auth/availability?email=${encodeURIComponent(email.toUpperCase())}`)).body.data.available, false);
    assert.equal((await request('/auth/availability?username=ab')).status, 400);
    assert.equal((await request('/auth/availability?email=invalid')).status, 400);
    assert.equal((await request('/auth/availability?username=bad%20name')).status, 400);
    assert.equal((await request('/auth/register', undefined, { username: username.toUpperCase(), email, password })).status, 409);
    assert.equal((await request('/auth/register', undefined, { username: 'different_username', email: email.toUpperCase(), password })).status, 409);
    const signedIn = await request('/auth/login', undefined, { identifier: username.toUpperCase(), password });
    assert.equal(signedIn.status, 200);
    assert.equal(signedIn.body.data.user.id, studentId);
    assert.equal((await request('/auth/login', undefined, { identifier: email.toUpperCase(), password })).status, 200);
    assert.equal((await request('/auth/login', undefined, { identifier: username, password: 'incorrect' })).status, 401);
  });

  it('validates registration types and passwords and rejects wrong login passwords', async () => {
    assert.equal((await request('/auth/register', undefined, { username: 7, email, password })).status, 400);
    assert.equal((await request('/auth/register', undefined, { username, email, password: 'short' })).status, 400);
    assert.equal((await request('/auth/login', undefined, { email, password: 'incorrect' })).status, 401);
    assert.equal((await request('/auth/login', undefined, { email, password })).status, 200);
    assert.equal((await request('/auth/me', studentToken)).body.data.id, studentId);
  });

  it('requires authentication for all attempt routes and the answer bank', async () => {
    for (const path of ['/questions', `/attempts/user/${studentId}`, '/attempts/fake', `/tests/${testId}/leaderboard`]) {
      assert.equal((await request(path)).status, 401);
    }
    assert.equal((await request('/attempts', undefined, { testId })).status, 401);
    assert.equal((await request(`/attempts/user/${adminId}`, studentToken)).status, 403);
  });

  it('allows admins to save questions and atomically update marks', async () => {
    const r = await request('/questions', adminToken, { testId, questionText: '2 + 2?', marks: 2, negativeMarks: 0.5,
      explanation: 'Two plus two is four.', options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] });
    assert.equal(r.status, 201);
    questionId = r.body.data.id;
    correctOptionId = r.body.data.options.find((o: { isCorrect: boolean }) => o.isCorrect).id;
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: testId } })).totalMarks, 2);
    assert.equal((await request('/questions', adminToken)).status, 200);
    assert.equal((await request('/questions', studentToken, { testId })).status, 403);
  });

  it('lets admins create categories and tagged tests', async () => {
    const category = await request('/exams', adminToken, {
      name: 'Managed Competitive Category', code: `MC-${Date.now()}`, category: 'competitive',
    });
    assert.equal(category.status, 201);
    managedCategoryId = category.body.data.id;
    const test = await request('/tests', adminToken, {
      title: 'Previous Year Practice', categoryId: managedCategoryId,
      durationMinutes: 45, passingMarks: 12,
      tags: ['Competitive Exam', 'Previous Year'],
    });
    assert.equal(test.status, 201);
    managedTestId = test.body.data.id;
    assert.equal(test.body.data.categoryName, 'Managed Competitive Category');
    assert.deepEqual(test.body.data.tags, ['Competitive Exam', 'Previous Year']);
    const catalog = await request('/tests');
    const listedTest = catalog.body.data.find((item: { id: string }) => item.id === managedTestId);
    assert.deepEqual(listedTest.tags, ['Competitive Exam', 'Previous Year']);
    assert.ok((await request('/exams')).body.data.some((item: { id: string }) => item.id === managedCategoryId));
  });

  it('does not expose answer keys or explanations before submission and hides drafts', async () => {
    const r = await request(`/tests/${testId}`);
    assert.equal(r.status, 200);
    assert.ok(!('explanation' in r.body.data.questions[0]));
    assert.ok(r.body.data.questions[0].options.every((o: object) => !('isCorrect' in o)));
    assert.equal((await request(`/tests/${hiddenTestId}`)).status, 404);
  });

  it('combines category and search filters instead of replacing one with the other', async () => {
    const matching = await request('/tests?category=Science&search=Integration');
    assert.ok(matching.body.data.some((t: { id: string }) => t.id === testId));
    const wrongCategory = await request('/tests?category=Unrelated&search=Integration');
    assert.equal(wrongCategory.body.data.length, 0);
  });

  it('rejects invalid question keys and rolls back a question if its test is missing', async () => {
    const payload = { testId, questionText: 'Invalid', marks: 1, negativeMarks: 0,
      options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] };
    assert.equal((await request('/questions', adminToken, payload)).status, 400);
    const beforeCount = await prisma.question.count();
    const r = await request('/questions', adminToken, { ...payload, testId: 'missing-test',
      options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] });
    assert.ok(r.status >= 400);
    assert.equal(await prisma.question.count(), beforeCount);
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: testId } })).totalMarks, 2);
  });

  it('rejects malformed, duplicate and foreign answers without saving attempts', async () => {
    const valid = { questionId, selectedOptionId: correctOptionId };
    for (const answers of [null, [valid, valid], [{ ...valid, selectedOptionId: 'foreign' }], [{ ...valid, questionId: 'foreign' }]]) {
      assert.equal((await request('/attempts', studentToken, { testId, answers, timeSpentSeconds: 1 })).status, 400);
    }
    assert.equal((await request('/attempts', studentToken, { testId, answers: [], timeSpentSeconds: -1 })).status, 400);
    assert.equal((await request('/attempts', studentToken, { testId, answers: [], timeSpentSeconds: 61 })).status, 400);
    for (const questionTimes of [null, [], [{ questionId, timeSpentSeconds: -1 }], [{ questionId, timeSpentSeconds: .5 }], [{ questionId: 'foreign', timeSpentSeconds: 5 }], [{ questionId, timeSpentSeconds: 4 }]]) {
      assert.equal((await request('/attempts', studentToken, { testId, answers: [], timeSpentSeconds: 5, questionTimes })).status, 400);
    }
    assert.equal(await prisma.testAttempt.count({ where: { testId } }), 0);
  });

  it('grades on the server, ignores supplied userId, and saves answer review', async () => {
    const r = await request('/attempts', studentToken, { testId, userId: adminId, score: 999, answers: [{ questionId, selectedOptionId: correctOptionId }], timeSpentSeconds: 5, questionTimes: [{ questionId, timeSpentSeconds: 5 }] });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.score, 2);
    assert.equal(r.body.data.questionReview[0].correctOptionId, correctOptionId);
    assert.equal(r.body.data.questionReview[0].timeSpentSeconds, 5);
    attemptId = r.body.data.attemptId;
    assert.equal((await prisma.testAttempt.findUniqueOrThrow({ where: { id: attemptId } })).userId, studentId);
    const history = await request(`/attempts/user/${studentId}`, studentToken);
    assert.equal(history.body.data.length, 1);
    const review = await request(`/attempts/${attemptId}`, studentToken);
    assert.equal(review.body.data.userAnswers[0].question.options.length, 2);
    assert.equal(review.body.data.userAnswers[0].timeSpentSeconds, 5);
    const repeatAttempt = await request('/attempts', studentToken, { testId, answers: [], timeSpentSeconds: 20 });
    assert.equal(repeatAttempt.status, 201);
    assert.equal(repeatAttempt.body.data.score, 0);
    assert.equal(repeatAttempt.body.data.questionReview[0].timeSpentSeconds, null);
    const leaderboard = await request(`/tests/${testId}/leaderboard`, studentToken);
    assert.equal(leaderboard.status, 200);
    assert.equal(leaderboard.body.data.length, 1, 'repeat attempts must not occupy multiple ranks');
    assert.equal(leaderboard.body.data[0].name, username);
    assert.equal(leaderboard.body.data[0].score, 2);
    assert.equal(leaderboard.body.data[0].timeSpentSeconds, 5);
  });

  it('ranks this attempt against one best result per other participant and protects private results', async () => {
    const rankingTest = await prisma.test.create({ data: { title: 'Ranking fixture', categoryName: 'Ranking', durationMinutes: 1 } });
    const peer = await prisma.user.create({ data: { name: 'Ranking Peer', email: `peer-${email}`, password: 'unusable-fixture', role: 'STUDENT' } });
    const create = (userId: string, score: number, seconds: number) => prisma.testAttempt.create({ data: {
      testId: rankingTest.id, userId, score, maxScore: 10, percentage: score * 10, passed: score >= 4,
      correctCount: 0, incorrectCount: 0, unansweredCount: 0, timeSpentSeconds: seconds,
    } });
    try {
      const target = await create(studentId, 6, 20);
      await create(studentId, 9, 5);
      const other = await create(adminId, 8, 10);
      await create(adminId, 2, 1);
      await create(peer.id, 4, 40);
      const result = await request(`/attempts/${target.id}/performance`, studentToken);
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.data, { rank: 2, totalParticipants: 3, percentile: 33.33 });
      assert.equal((await request(`/attempts/${other.id}/performance`, studentToken)).status, 404);
      assert.equal((await request(`/attempts/${target.id}/performance`, adminToken)).status, 200);
      assert.equal((await request(`/attempts/${target.id}/performance`)).status, 401);
      await create(peer.id, 6, 10);
      assert.deepEqual((await request(`/attempts/${target.id}/performance`, studentToken)).body.data, { rank: 3, totalParticipants: 3, percentile: 0 });
    } finally {
      await prisma.test.delete({ where: { id: rankingTest.id } });
      await prisma.user.delete({ where: { id: peer.id } });
    }
  });

  it('denies access to other students even with a valid token', async () => {
    // Admin token claims are resolved against the current database role on every request.
    await prisma.user.update({ where: { id: adminId }, data: { role: 'STUDENT' } });
    assert.equal((await request(`/attempts/${attemptId}`, adminToken)).status, 404);
    assert.equal((await request('/questions', adminToken)).status, 403);
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    assert.equal((await request(`/attempts/${attemptId}`, adminToken)).status, 200);
  });

  it('keeps historical answer review when admins try to delete a used question', async () => {
    assert.equal((await request(`/questions/${questionId}`, adminToken, undefined, 'DELETE')).status, 409);
    assert.equal(await prisma.userAnswer.count({ where: { attemptId } }), 1);
  });

  it('archives tests without deleting historical attempts or answer reviews', async () => {
    const archived = await request(`/tests/${testId}`, adminToken, undefined, 'DELETE');
    assert.equal(archived.status, 200);
    assert.equal((await request(`/tests/${testId}`)).status, 404);
    const attempt = await request(`/attempts/${attemptId}`, studentToken);
    assert.equal(attempt.status, 200);
    assert.equal(attempt.body.data.userAnswers[0].question.id, questionId);
  });

  it('uses actual question marks for the passing threshold', async () => {
    const thresholdTest = await prisma.test.create({
      data: {
        title: 'Passing Threshold Test', categoryName: 'Science', durationMinutes: 1,
        totalMarks: 8, passingMarks: 4,
        questions: { create: [
          { questionText: 'Q1', marks: 2, options: { create: [{ text: 'A', isCorrect: true }, { text: 'B' }] } },
          { questionText: 'Q2', marks: 2, options: { create: [{ text: 'A', isCorrect: true }, { text: 'B' }] } },
        ] },
      },
      include: { questions: { include: { options: true } } },
    });
    thresholdTestId = thresholdTest.id;
    const q1 = thresholdTest.questions[0];
    const correct = q1.options.find(option => option.isCorrect)!;
    const result = await request('/attempts', studentToken, {
      testId: thresholdTest.id,
      answers: [{ questionId: q1.id, selectedOptionId: correct.id }],
      timeSpentSeconds: 1,
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.maxScore, 4);
    assert.equal(result.body.data.percentage, 50);
    assert.equal(result.body.data.passed, false);
  });

  it('handles negative marking, skipped questions and fractional marks consistently', () => {
    const q = (id: string) => ({ id, marks: 1.5, negativeMarks: 0.25, options: [{ id: `${id}-a`, isCorrect: true }, { id: `${id}-b`, isCorrect: false }] });
    const r = gradeAttempt([q('a'), q('b'), q('c')], [{ questionId: 'a', selectedOptionId: 'a-a' }, { questionId: 'b', selectedOptionId: 'b-b' }]);
    assert.equal(r.score, 1.25); assert.equal(r.maxScore, 4.5);
    assert.equal(r.correctCount, 1); assert.equal(r.incorrectCount, 1); assert.equal(r.unansweredCount, 1);
  });

  it('does not turn a failing score into a pass by rounding the displayed percentage', () => {
    const questions = [
      { id: 'q1', marks: 3.96, negativeMarks: 0, options: [{ id: 'a', isCorrect: true }] },
      { id: 'q2', marks: 6.04, negativeMarks: 0, options: [{ id: 'b', isCorrect: true }] },
    ];
    const result = gradeAttempt(questions, [{ questionId: 'q1', selectedOptionId: 'a' }], 40);
    assert.equal(result.percentage, 40);
    assert.equal(result.passed, false);
    assert.equal(gradeAttempt([], [], 0).passed, false);
  });
});
