export interface GradedAnswer {
    questionId: string;
    selectedOptionId?: string;
    isCorrect: boolean;
    marksAwarded: number;
    correctOptionId?: string;
}
export interface GradingResult {
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    answersGraded: GradedAnswer[];
}
export interface QuestionGradingInput {
    id: string;
    marks: number;
    negativeMarks: number;
    options: {
        id: string;
        isCorrect: boolean;
    }[];
}
export interface UserAnswerInput {
    questionId: string;
    selectedOptionId?: string;
}
/**
 * Grade student answers against test questions with precision
 */
export declare const gradeAttempt: (questions: QuestionGradingInput[], userAnswers: UserAnswerInput[], passingPercentage?: number) => GradingResult;
