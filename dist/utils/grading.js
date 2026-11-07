"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeAttempt = void 0;
/**
 * Grade student answers against test questions with precision
 */
const gradeAttempt = (questions, userAnswers, passingPercentage = 40) => {
    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const answersGraded = [];
    // Map user answers by questionId
    const answersMap = new Map();
    for (const ans of userAnswers) {
        if (ans.selectedOptionId) {
            answersMap.set(ans.questionId, ans.selectedOptionId);
        }
    }
    // Calculate max score
    const maxScore = questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);
    for (const question of questions) {
        const selectedId = answersMap.get(question.id);
        const correctOption = question.options.find((o) => o.isCorrect);
        const correctOptionId = correctOption?.id;
        if (!selectedId) {
            unansweredCount++;
            answersGraded.push({
                questionId: question.id,
                isCorrect: false,
                marksAwarded: 0,
                correctOptionId,
            });
            continue;
        }
        const isMatch = selectedId === correctOptionId;
        if (isMatch) {
            const marks = question.marks ?? 1;
            score += marks;
            correctCount++;
            answersGraded.push({
                questionId: question.id,
                selectedOptionId: selectedId,
                isCorrect: true,
                marksAwarded: marks,
                correctOptionId,
            });
        }
        else {
            const penalty = question.negativeMarks ?? 0.25;
            score -= penalty;
            incorrectCount++;
            answersGraded.push({
                questionId: question.id,
                selectedOptionId: selectedId,
                isCorrect: false,
                marksAwarded: -penalty,
                correctOptionId,
            });
        }
    }
    // Bound score at 0 minimum and 2 decimal points
    const finalScore = Math.max(0, Number(score.toFixed(2)));
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
    const passed = maxScore > 0 && (finalScore / maxScore) * 100 >= passingPercentage;
    return {
        score: finalScore,
        maxScore,
        percentage,
        passed,
        correctCount,
        incorrectCount,
        unansweredCount,
        answersGraded,
    };
};
exports.gradeAttempt = gradeAttempt;
