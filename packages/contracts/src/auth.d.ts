import type { z } from "zod";
export declare const adminLoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const adminLoginResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    expiresInSeconds: z.ZodNumber;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        tenantId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const refreshTokenRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const refreshTokenResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    expiresInSeconds: z.ZodNumber;
}, z.core.$strip>;
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;
//# sourceMappingURL=auth.d.ts.map