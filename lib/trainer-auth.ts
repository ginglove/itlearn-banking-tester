import { cookies } from 'next/headers';
import { env } from './config';
import { verifyTrainerToken } from './auth';

export async function isTrainerAuthorized(req: Request): Promise<boolean> {
  // Check header
  const pinHeader = req.headers.get('x-trainer-pin');
  if (pinHeader && pinHeader === env.TRAINER_PIN) {
    return true;
  }

  // Check cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('trainer_token')?.value;
    if (token) {
      const payload = await verifyTrainerToken(token);
      if (payload && payload.role === 'trainer') {
        return true;
      }
    }
  } catch {}

  return false;
}
