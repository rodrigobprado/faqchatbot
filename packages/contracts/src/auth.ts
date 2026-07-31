import { z } from "zod";

export const adminLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const adminLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    tenantId: z.string().uuid()
  })
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1)
});

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive()
});

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;
