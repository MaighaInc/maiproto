import { Router } from 'express';
import type { AuthService } from './auth.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import type { JwtService } from '@receiptflow/auth/jwt';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
} from '@receiptflow/shared/validators';

export function createAuthRouter(authService: AuthService, jwtService: JwtService): Router {
  const router = Router();

  // POST /auth/register
  router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
    const result = await authService.register(req.body as Parameters<AuthService['register']>[0]);
    res.status(201).json({ success: true, data: result });
  }));

  // POST /auth/login
  router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
    const result = await authService.login(req.body as Parameters<AuthService['login']>[0]);
    res.json({ success: true, data: result });
  }));

  // POST /auth/refresh
  router.post('/refresh', validate(refreshTokenSchema), asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: tokens });
  }));

  // POST /auth/logout
  router.post('/logout', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true });
  }));

  // POST /auth/verify-email
  router.post('/verify-email', validate(verifyEmailSchema), asyncHandler(async (req, res) => {
    const { token } = req.body as { token: string };
    await authService.verifyEmail(token);
    res.json({ success: true });
  }));

  // POST /auth/forgot-password
  router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);
    res.json({ success: true });
  }));

  // POST /auth/reset-password
  router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);
    res.json({ success: true });
  }));

  // POST /auth/mfa/setup (authenticated)
  router.post('/mfa/setup', authenticate(jwtService), asyncHandler(async (req, res) => {
    const result = await authService.setupMfa(req.auth!.sub);
    res.json({ success: true, data: result });
  }));

  // POST /auth/mfa/confirm (authenticated)
  router.post('/mfa/confirm', authenticate(jwtService), asyncHandler(async (req, res) => {
    const { token } = req.body as { token: string };
    await authService.confirmMfa(req.auth!.sub, token);
    res.json({ success: true });
  }));

  return router;
}
