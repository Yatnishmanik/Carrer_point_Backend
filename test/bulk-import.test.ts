import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import type { Server } from 'node:http';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { generateToken } from '../src/utils/jwt';

const db = new URL(process.env.DATABASE_URL!);
assert.equal(process.env.NODE_ENV, 'test');
assert.match(db.pathname, /test/i);
assert.ok(['localhost', '127.0.0.1'].includes(db.hostname));
let server: Server, base: string, testId: string, otherTestId: string;
let adminToken: string, studentToken: string, superToken: string;
const userIds: string[] = [];
const stamp = Date.now();
const question = (text: string, marks = 1) => ({ questionText: text, subject: 'Science', explanation: 'Line 1\nहिंदी व्याख्या', marks, negativeMarks: .25,
  options: ['A', 'B', 'C', 'D'].map((text, index) => ({ text, isCorrect: index === 1 })) });

async function upload(body: unknown, token?: string) {
  const response = await fetch(`${base}/api/questions/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
  const tokens: string[] = [];
  for (const role of ['ADMIN', 'STUDENT', 'SUPERADMIN'] as const) {
    const user = await prisma.user.create({ data: { name: `Bulk ${role}`, email: `bulk-${stamp}-${role}@example.invalid`, password: 'unusable-test-fixture', role } });
    userIds.push(user.id); tokens.push(generateToken({ userId: user.id, email: user.email, role }));
  }
  [adminToken, studentToken, superToken] = tokens;
  const test = await prisma.test.create({ data: { title: 'Bulk target fixture', categoryName: 'Science', durationMinutes: 30, totalMarks: 2 } });
  testId = test.id;
  otherTestId = (await prisma.test.create({ data: { title: 'Other fixture', categoryName: 'Science', durationMinutes: 30 } })).id;
  const q = question('Existing question', 2);
  await prisma.question.create({ data: { ...q, testId, order: 7, options: { create: q.options.map((option, order) => ({ ...option, order })) } } });
});
after(async () => {
  await prisma.test.deleteMany({ where: { id: { in: [testId, otherTestId].filter(Boolean) } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('Bulk question import', () => {
  it('rejects anonymous users and students without adding questions', async () => {
    assert.equal((await upload({ testId, questions: [question('Unauthorized')] })).status, 401);
    assert.equal((await upload({ testId, questions: [question('Unauthorized')] }, studentToken)).status, 403);
    assert.equal(await prisma.question.count({ where: { testId } }), 1);
  });
  it('rejects invalid payloads and invalid rows without a partial write or marks change', async () => {
    for (const payload of [null, {}, { testId, questions: [] }, { testId, questions: Array.from({ length: 501 }, () => question('Too many')) },
      { testId, questions: [question('Valid first'), { ...question('Invalid second'), marks: 0 }] },
      { testId, questions: [{ ...question('Bad options'), options: [{ text: 'A', isCorrect: true }] }] },
      { testId, questions: [{ ...question('Bad key'), options: question('Q').options.map(option => ({ ...option, isCorrect: true })) }] },
      { testId, questions: [question('Duplicate'), question('Duplicate')] },
    ]) assert.equal((await upload(payload, adminToken)).status, 400);
    assert.equal(await prisma.question.count({ where: { testId } }), 1);
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: testId } })).totalMarks, 2);
  });
  it('rejects a missing test and rolls back without orphan questions', async () => {
    assert.equal((await upload({ testId: 'missing-bulk-test', questions: [question('Orphan')] }, adminToken)).status, 404);
    assert.equal(await prisma.question.count({ where: { questionText: 'Orphan' } }), 0);
  });
  it('appends questions and options in file order, updates marks, and targets only the selected test', async () => {
    const result = await upload({ testId, questions: [{ ...question('Imported 1', 1.5), testId: otherTestId }, question('Imported 2', 2.25)] }, adminToken);
    assert.equal(result.status, 201);
    assert.equal(result.body.data.importedCount, 2);
    assert.equal(result.body.data.totalMarks, 5.75);
    const rows = await prisma.question.findMany({ where: { testId }, orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } });
    assert.deepEqual(rows.map(row => row.order), [7, 8, 9]);
    assert.deepEqual(rows.slice(1).map(row => row.questionText), ['Imported 1', 'Imported 2']);
    assert.equal(rows[1].explanation, 'Line 1\nहिंदी व्याख्या');
    assert.deepEqual(rows[1].options.map(option => option.text), ['A', 'B', 'C', 'D']);
    assert.equal(rows[1].options[1].isCorrect, true);
    assert.equal(await prisma.question.count({ where: { testId: otherTestId } }), 0);
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: otherTestId } })).totalMarks, 0);
    const response = await fetch(`${base}/api/tests/${testId}`);
    const test = await response.json();
    assert.equal(test.data.questions.length, 3);
    assert.ok(test.data.questions.every((q: { options: object[] }) => q.options.every(option => !('isCorrect' in option))));
  });
  it('prevents importing existing content again and permits superadmins to import', async () => {
    assert.equal((await upload({ testId, questions: [question('Imported 1', 1.5)] }, adminToken)).status, 409);
    assert.equal((await upload({ testId, questions: [question('Superadmin upload')] }, superToken)).status, 201);
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: testId } })).totalMarks, 6.75);
  });
  it('serializes simultaneous imports without losing marks or reusing question order', async () => {
    const results = await Promise.all(['Concurrent A', 'Concurrent B'].map(text => upload({ testId, questions: [question(text)] }, adminToken)));
    assert.ok(results.every(result => result.status === 201));
    const rows = await prisma.question.findMany({ where: { testId } });
    assert.equal(new Set(rows.map(row => row.order)).size, rows.length);
    assert.equal((await prisma.test.findUniqueOrThrow({ where: { id: testId } })).totalMarks, 8.75);
    const repeated = await Promise.all([0, 1].map(() => upload({ testId, questions: [question('Concurrent duplicate')] }, adminToken)));
    assert.deepEqual(repeated.map(result => result.status).sort(), [201, 409]);
    assert.equal(await prisma.question.count({ where: { testId, questionText: 'Concurrent duplicate' } }), 1);
  });
  it('accepts valid bulk JSON larger than the default Express limit and rejects oversized bodies', async () => {
    const questions = Array.from({ length: 12 }, (_, index) => ({ ...question(`Large valid ${index}: ${'x'.repeat(8000)}`), explanation: 'y'.repeat(10000) }));
    assert.ok(Buffer.byteLength(JSON.stringify({ testId, questions })) > 100 * 1024);
    assert.equal((await upload({ testId, questions }, adminToken)).status, 201);
    assert.equal((await upload({ testId, padding: 'x'.repeat(3 * 1024 * 1024) }, adminToken)).status, 413);
  });
});
