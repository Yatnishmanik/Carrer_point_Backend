export interface ImportedQuestion {
    questionText: string;
    subject?: string;
    explanation?: string;
    marks: number;
    negativeMarks: number;
    options: {
        text: string;
        isCorrect: boolean;
    }[];
}
export declare const MAX_IMPORT_QUESTIONS = 500;
export declare function validateImportedQuestion(value: unknown): {
    question?: ImportedQuestion;
    message?: string;
};
export declare function questionFingerprint(q: ImportedQuestion): string;
