import assert from 'node:assert/strict';
import { it } from 'node:test';
import { summarizeSections, allocateQuestionSeconds } from '../../frontend/lib/performance';
import type { TestAttemptResult } from '../../frontend/types';

const result: TestAttemptResult = {
  id: 'attempt', testId: 'test', testTitle: 'Test', timestamp: '', totalQuestions: 3,
  attempted: 2, correct: 1, wrong: 1, unanswered: 1, score: 1.5, maxScore: 6,
  percentage: 25, timeSpentSeconds: 12, markedQuestions: [], answers: { 0: 0, 1: 1 },
  questions: [
    { id: 'a', subject: 'Science', questionText: 'A', options: [], correctOptionIndex: 0, marks: 2, negativeMarks: .5 },
    { id: 'b', subject: 'Math', questionText: 'B', options: [], correctOptionIndex: 0, marks: 2, negativeMarks: .5 },
    { id: 'c', subject: 'Science', questionText: 'C', options: [], correctOptionIndex: 0, marks: 2, negativeMarks: .5 },
  ], questionTimes: { a: 5, b: 7, c: 0 }, questionMarks: { a: 2, b: -.5, c: 0 },
};

it('groups graded marks, attempted counts, accuracy and saved timing by subject', () => {
  const [science, math] = summarizeSections(result);
  assert.deepEqual(science, { name: 'Science', score: 2, maxScore: 4, attempted: 1, total: 2, correct: 1, wrong: 0, accuracy: 100, timeSpentSeconds: 5 });
  assert.equal(math.score, -.5);
  assert.equal(math.accuracy, 0);
  assert.equal(math.timeSpentSeconds, 7);
  assert.equal(science.score + math.score, result.score);
});
it('shows missing legacy timing as unknown and handles an unattempted section', () => {
  const sections = summarizeSections({ ...result, answers: {}, questionMarks: {}, questionTimes: {} });
  assert.ok(sections.every(section => section.timeSpentSeconds === null && section.accuracy === 0 && section.attempted === 0));
});
it('rounds question timing without changing the elapsed test duration', () => {
  const timing = allocateQuestionSeconds({ 0: 1600, 1: 1600, 2: 1600 }, 5);
  assert.deepEqual(timing, { 0: 2, 1: 2, 2: 1 });
  assert.equal(Object.values(timing).reduce((sum, seconds) => sum + seconds, 0), 5);
  assert.deepEqual(allocateQuestionSeconds({ 0: 0 }, 0), { 0: 0 });
});
