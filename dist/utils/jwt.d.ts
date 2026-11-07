export interface TokenPayload {
    userId: string;
    email: string;
    role: 'STUDENT' | 'ADMIN' | 'SUPERADMIN';
}
export declare const generateToken: (payload: TokenPayload) => string;
export declare const verifyToken: (token: string) => TokenPayload;
