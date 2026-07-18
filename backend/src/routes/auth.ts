import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { generateToken, rateLimiter, generateOTP } from '../middleware/auth.js';
import { emitActivity } from '../index.js';
import type { SignupRequest, LoginRequest, VerifyOtpRequest } from '../types/index.js';

export const authRouter = Router();

const OTP_EXPIRY_MINUTES = 5;
const OTP_MOCK = process.env.OTP_MOCK === 'true';

// ─── POST /api/auth/signup ────────────────────────────────

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { phone, fullName, email, role, countryCode } = req.body as SignupRequest;

    if (!phone || !fullName || !role) {
      return res.status(400).json({ error: 'phone, fullName, and role are required' });
    }

    if (role !== 'CUSTOMER' && role !== 'PROVIDER') {
      return res.status(400).json({ error: 'role must be CUSTOMER or PROVIDER' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const user = await prisma.user.create({
      data: {
        phone,
        fullName,
        email: email || null,
        role,
        countryCode: countryCode || 'KE',
      },
    });

    // If PROVIDER, create the associated Provider record
    if (role === 'PROVIDER') {
      await prisma.provider.create({
        data: {
          userId: user.id,
          verificationStatus: 'UNVERIFIED',
          countryCode: countryCode || 'KE',
        },
      });
    }

    emitActivity('USER_SIGNED_UP', user.id, user.fullName, {
      role: user.role,
      phone: user.phone,
    });

    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });

    return res.status(201).json({ token, user });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────

authRouter.post('/login', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, countryCode } = req.body as LoginRequest;

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }

    // Find or create user (auto-signup for returning users)
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          fullName: 'New User',
          role: 'CUSTOMER',
          countryCode: countryCode || 'KE',
        },
      });

      emitActivity('USER_AUTO_SIGNUP', user.id, user.fullName, {
        role: user.role,
        phone: user.phone,
      });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpRecord.create({
      data: {
        userId: user.id,
        code,
        purpose: 'LOGIN',
        expiresAt,
      },
    });

    // In mock mode, return the OTP code in the response
    const response: { message: string; phone: string; mockCode?: string } = {
      message: 'OTP sent to your phone',
      phone: user.phone,
    };

    if (OTP_MOCK) {
      response.mockCode = code;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/verify-otp ─────────────────────────────

authRouter.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body as VerifyOtpRequest;

    if (!phone || !code) {
      return res.status(400).json({ error: 'phone and code are required' });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the most recent valid (unused, unexpired) OTP for this user
    const otpRecord = await prisma.otpRecord.findFirst({
      where: {
        userId: user.id,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark the OTP as used
    await prisma.otpRecord.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    emitActivity('USER_LOGGED_IN', user.id, user.fullName, {
      phone: user.phone,
      role: user.role,
    });

    const token = generateToken({ id: user.id, role: user.role, phone: user.phone });

    return res.status(200).json({ token, user });
  } catch (error) {
    console.error('[Auth] Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
