import { z } from "zod";

export const adminLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export const adminLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    tenantId: z.uuid(),
    roles: z.array(z.string()).default([])
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
