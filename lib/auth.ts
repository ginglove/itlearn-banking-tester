import { SignJWT, jwtVerify } from 'jose';
import { env } from './config';

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export interface OnboardingPayload {
  onboardingId: string;
  sandboxId: string;
  phoneNumber: string;
}

export interface TrainerPayload {
  role: 'trainer';
  sandboxId?: string;
}

/**
 * Sign an Onboarding JWT valid for 30 minutes
 */
export async function signOnboardingToken(payload: OnboardingPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(secret);
}

/**
 * Verify Onboarding Bearer Token
 */
export async function verifyOnboardingToken(token: string): Promise<OnboardingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as OnboardingPayload;
  } catch {
    return null;
  }
}

/**
 * Sign Trainer Session Token valid for 8 hours
 */
export async function signTrainerToken(payload: TrainerPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verify Trainer Token
 */
export async function verifyTrainerToken(token: string): Promise<TrainerPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TrainerPayload;
  } catch {
    return null;
  }
}
