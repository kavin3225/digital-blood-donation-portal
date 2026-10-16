import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { ENV } from '../config/env';

let oauthClient: OAuth2Client | null = null;
const COLLEGE_EMAIL_DOMAIN = 'bitsathy.ac.in';

if (ENV.GOOGLE_CLIENT_ID_FORMAT_VALID) {
  oauthClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);
}

export interface VerifiedCollegeUser {
  googleSubjectId: string;
  email: string;
  name: string;
  picture?: string;
  hostedDomain?: string;
}

export class GoogleAuthVerificationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'GoogleAuthVerificationError';
    this.statusCode = statusCode;
  }
}

/**
 * Verifies Google ID token from Google Identity Services.
 * Enforces:
 * - Signature, Issuer, Audience, Expiry
 * - Exact Workspace hosted domain: bitsathy.ac.in
 * - Email verification
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<VerifiedCollegeUser> => {
  if (!idToken || typeof idToken !== 'string') {
    throw new GoogleAuthVerificationError('Missing Google ID token', 400);
  }

  // Handle simulated / test environment tokens if explicitly prefixed in test/dev
  if (
    ENV.NODE_ENV === 'test' &&
    idToken.startsWith('mock-test-token:')
  ) {
    const parts = idToken.split(':');
    const mockEmail = parts[1]?.toLowerCase().trim();
    const mockSub = parts[2] || 'mock-sub-12345';
    const mockDomain = mockEmail.split('@')[1];

    if (mockDomain !== COLLEGE_EMAIL_DOMAIN) {
      throw new GoogleAuthVerificationError(
        `Personal Gmail or other organization accounts are prohibited. You must sign in with your official @${COLLEGE_EMAIL_DOMAIN} Google Workspace account.`,
        403
      );
    }

    return {
      googleSubjectId: mockSub,
      email: mockEmail,
      name: parts[3] || 'BIT Test Student',
      hostedDomain: mockDomain,
    };
  }

  if (!ENV.GOOGLE_CLIENT_ID_FORMAT_VALID) {
    throw new GoogleAuthVerificationError(
      'Google sign-in is not configured with a valid OAuth Web client ID. Set the active client ID in server/.env and restart the API.',
      500
    );
  }

  try {
    if (!oauthClient) {
      oauthClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new GoogleAuthVerificationError('Invalid token payload', 401);
    }

    const email = (payload.email || '').toLowerCase().trim();
    const hostedDomain = (payload.hd || '').toLowerCase().trim();

    // Strict email verification check
    if (!payload.email_verified) {
      throw new GoogleAuthVerificationError('Google account email is not verified', 401);
    }

    // Strict Google Workspace hosted domain verification
    if (hostedDomain !== COLLEGE_EMAIL_DOMAIN || !email.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
      throw new GoogleAuthVerificationError(
        `Personal Gmail or other organization accounts are strictly prohibited. Access is restricted exclusively to Bannari Amman Institute of Technology accounts (@${COLLEGE_EMAIL_DOMAIN}).`,
        403
      );
    }

    return {
      googleSubjectId: payload.sub,
      email,
      name: payload.name || email.split('@')[0],
      picture: payload.picture,
      hostedDomain,
    };
  } catch (err: any) {
    if (err instanceof GoogleAuthVerificationError) {
      throw err;
    }
    console.error('[GoogleAuth] Token verification failed:', err.message);
    throw new GoogleAuthVerificationError(`Google token verification failed: ${err.message}`, 401);
  }
};
