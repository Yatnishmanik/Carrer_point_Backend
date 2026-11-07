import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { it } from 'node:test';
import { parseQuestionImport } from '../../frontend/lib/question-import';

const header = 'question,optionA,optionB,optionC,optionD,correctAnswer,subject,explanation,marks,negativeMarks';
const row = { question: '2 + 2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctAnswer: 'B' };

it('both downloadable templates parse to the same English/Hindi question payload', () => {
  const base = path.resolve(__dirname, '../../frontend/public/templates');
  const csv = parseQuestionImport(readFileSync(path.join(base, 'questions-template.csv'), 'utf8'), 'csv');
  const json = parseQuestionImport(readFileSync(path.join(base, 'questions-template.json'), 'utf8'), 'json');
  assert.deepEqual(csv.errors, []);
  assert.deepEqual(json.errors, []);
  assert.deepEqual(csv.rows.map(row => row.question), json.rows.map(row => row.question));
  assert.equal(csv.rows[1].question.questionText, '2 + 2 का मान क्या है?');
});

it('CSV preserves quoted commas, escaped quotes and multiline explanations with correct source rows', () => {
  const text = '\uFEFF' + header + '\r\n"What, exactly?",A,B,C,D,b,Science,"First line\r\nSecond ""quoted"" line",,\r\n\r\nOther,A,B,C,D,X,,,,\r\n';
  const result = parseQuestionImport(text, 'csv');
  assert.equal(result.rows[0].question.questionText, 'What, exactly?');
  assert.equal(result.rows[0].question.explanation, 'First line\nSecond "quoted" line');
  assert.equal(result.rows[0].question.marks, 1);
  assert.equal(result.rows[0].question.negativeMarks, .25);
  assert.equal(result.rows[0].question.options[1].isCorrect, true);
  assert.equal(result.rows[0].row, 2);
  assert.equal(result.errors[0].row, 5);
});

it('rejects incomplete or malformed files with actionable format errors', () => {
  for (const text of ['', 'question,optionA\nQ,A', header + '\n"unclosed,A,B,C,D,A,,,,']) {
    assert.throws(() => parseQuestionImport(text, 'csv'));
  }
  assert.throws(() => parseQuestionImport(header + ',unknown\n', 'csv'), /Unknown columns/);
  assert.throws(() => parseQuestionImport(header + ',question\n', 'csv'), /duplicate column/);
  assert.throws(() => parseQuestionImport('{}', 'json'), /array/);
  assert.throws(() => parseQuestionImport('[', 'json'), /Invalid JSON/);
  assert.equal(parseQuestionImport(header + '\nQ,A,B', 'csv').errors[0].row, 2);
});

it('flags invalid numeric fields, missing options, bad answer keys and duplicate rows before importing', () => {
  const result = parseQuestionImport(JSON.stringify([
    row, { ...row, question: 'Bad numeric', marks: 'NaN', negativeMarks: -1 },
    { ...row, question: 'Bad option', optionC: '' }, { ...row, question: 'Bad key', correctAnswer: 'E' }, row,
  ]), 'json');
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.errors.map(error => error.row), [2, 3, 4, 5]);
  assert.match(result.errors[3].message, /Duplicate of row 1/);
  assert.throws(() => parseQuestionImport(JSON.stringify(Array.from({ length: 501 }, () => row)), 'json'), /at most 500/);
});

it('accepts decimal marks and normalized CSV headings without treating numeric zero as missing', () => {
  const result = parseQuestionImport('Question,Option A,Option B,Option C,Option D,Correct Answer,Marks,Negative Marks\nQ,A,B,C,D,a,1.5,0', 'csv');
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].question.marks, 1.5);
  assert.equal(result.rows[0].question.negativeMarks, 0);
  assert.equal(result.rows[0].question.options[0].isCorrect, true);
});
