import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function issueTokens(user: IUser): AuthTokens {
  const accessToken = signAccessToken({
    userId: user._id.toString(),
    email: user.email ?? '',
    role: user.role,
  });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });
  return { accessToken, refreshToken };
}

export function sanitize(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    walletAddress: user.walletAddress ?? null,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export const AuthService = {
  async register(input: RegisterInput) {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
    });

    const tokens = issueTokens(user);
    user.refreshTokens = [tokens.refreshToken];
    await user.save();

    return { user: sanitize(user), ...tokens };
  },

  async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select(
      '+password +refreshTokens'
    );
    if (!user || !(await user.comparePassword(input.password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated');
    }

    const tokens = issueTokens(user);
    // Keep a bounded list of active refresh tokens (max 5 devices)
    user.refreshTokens = [...user.refreshTokens.slice(-4), tokens.refreshToken];
    await user.save();

    return { user: sanitize(user), ...tokens };
  },

  async refresh(refreshToken: string) {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(payload.userId).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      // Token reuse or unknown user - revoke everything as a precaution
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      throw ApiError.unauthorized('Refresh token is no longer valid');
    }

    const tokens = issueTokens(user);
    user.refreshTokens = [
      ...user.refreshTokens.filter((t) => t !== refreshToken),
      tokens.refreshToken,
    ];
    await user.save();

    return { user: sanitize(user), ...tokens };
  },

  async logout(userId: string, refreshToken?: string) {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    user.refreshTokens = refreshToken
      ? user.refreshTokens.filter((t) => t !== refreshToken)
      : []; // no token provided -> log out of all devices
    await user.save();
  },

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return sanitize(user);
  },
};
