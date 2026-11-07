"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_IMPORT_QUESTIONS = void 0;
exports.validateImportedQuestion = validateImportedQuestion;
exports.questionFingerprint = questionFingerprint;
exports.MAX_IMPORT_QUESTIONS = 500;
function validateImportedQuestion(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { message: 'Expected a question object.' };
    const q = value;
    const errors = [];
    if (typeof q.questionText !== 'string' || !q.questionText.trim() || q.questionText.length > 10000)
        errors.push('Question text is required (maximum 10,000 characters).');
    for (const [field, limit] of [['subject', 200], ['explanation', 20000]]) {
        if (q[field] !== undefined && (typeof q[field] !== 'string' || q[field].length > limit))
            errors.push(`${field} must be text (maximum ${limit} characters).`);
    }
    const marks = q.marks === undefined ? 1 : q.marks;
    const negativeMarks = q.negativeMarks === undefined ? .25 : q.negativeMarks;
    if (typeof marks !== 'number' || !Number.isFinite(marks) || marks <= 0 || marks > 1000)
        errors.push('Marks must be a number greater than 0 and at most 1,000.');
    if (typeof negativeMarks !== 'number' || !Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 1000)
        errors.push('Negative marks must be a number from 0 to 1,000.');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !o || typeof o !== 'object' || typeof o.text !== 'string' || !o.text.trim() || o.text.length > 5000 || typeof o.isCorrect !== 'boolean') || q.options.filter(o => o?.isCorrect === true).length !== 1) {
        errors.push('Provide four nonempty answer options (maximum 5,000 characters each), with exactly one correct answer.');
    }
    if (errors.length)
        return { message: errors.join(' ') };
    return { question: {
            questionText: q.questionText.trim(), subject: q.subject?.trim() || undefined,
            explanation: q.explanation?.trim() || undefined,
            marks: marks, negativeMarks: negativeMarks,
            options: q.options.map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        } };
}
function questionFingerprint(q) {
    return JSON.stringify([q.questionText.trim(), q.subject?.trim() || '', q.marks, q.negativeMarks, q.options.map(o => [o.text.trim(), o.isCorrect])]);
}
