import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

export type UserRole = 'user' | 'admin' | 'guest';

export interface tokenPayload {
	id: string;
	role: UserRole;
}

const resolveSecret = (
	primaryName: 'ACCESS_TOKEN_SECRET' | 'REFRESH_TOKEN_SECRET',
	legacyName: 'JWT_ACCESS_SECRET_TOKEN' | 'JWT_REFRESH_SECRET_TOKEN',
	developmentFallback: string,
) => {
	const secret = process.env[primaryName] || process.env[legacyName];
	if (secret) return secret;

	if (process.env.NODE_ENV === 'production') {
		throw new Error(`${primaryName} is required in production`);
	}

	// Stable local-only fallback keeps development sessions usable across restarts.
	return developmentFallback;
};

const getAccessSecret = () =>
	resolveSecret(
		'ACCESS_TOKEN_SECRET',
		'JWT_ACCESS_SECRET_TOKEN',
		'lumina-local-access-secret-not-for-production',
	);

const getRefreshSecret = () =>
	resolveSecret(
		'REFRESH_TOKEN_SECRET',
		'JWT_REFRESH_SECRET_TOKEN',
		'lumina-local-refresh-secret-not-for-production',
	);

const getExpiry = (
	primaryName: 'ACCESS_TOKEN_EXPIRY' | 'REFRESH_TOKEN_EXPIRY',
	legacyName: 'JWT_ACCESS_TOKEN_EXPIRY' | 'JWT_REFRESH_TOKEN_EXPIRY',
	fallback: '15m' | '7d',
): SignOptions['expiresIn'] =>
	(process.env[primaryName] || process.env[legacyName] || fallback) as SignOptions['expiresIn'];

const parseTokenPayload = (
	decoded: string | JwtPayload,
): tokenPayload => {
	if (
		typeof decoded === 'string' ||
		typeof decoded.id !== 'string' ||
		!['user', 'admin', 'guest'].includes(String(decoded.role))
	) {
		throw new jwt.JsonWebTokenError('Invalid token payload');
	}

	return {
		id: decoded.id,
		role: decoded.role as UserRole,
	};
};

export const generateHashPassword = async (userPassword: string) =>
	bcrypt.hash(userPassword, 10);

export const compareUserPassword = async (
	userPassword: string,
	hashPassword: string,
) => bcrypt.compare(userPassword, hashPassword);

export const generateAccessToken = async (payload: tokenPayload) =>
	jwt.sign(payload, getAccessSecret(), {
		expiresIn: getExpiry(
			'ACCESS_TOKEN_EXPIRY',
			'JWT_ACCESS_TOKEN_EXPIRY',
			'15m',
		),
	});

export const generateRefreshToken = async (payload: tokenPayload) =>
	jwt.sign(payload, getRefreshSecret(), {
		expiresIn: getExpiry(
			'REFRESH_TOKEN_EXPIRY',
			'JWT_REFRESH_TOKEN_EXPIRY',
			'7d',
		),
	});

export const verifyAccessToken = async (token: string): Promise<tokenPayload> =>
	parseTokenPayload(jwt.verify(token, getAccessSecret()));

export const verifyRefreshToken = async (token: string): Promise<tokenPayload> =>
	parseTokenPayload(jwt.verify(token, getRefreshSecret()));

export const generateToken = async () => {
	const token = randomBytes(32).toString('hex');
	return { token, hashedToken: hashToken(token) };
};

export const hashToken = (token: string) =>
	createHash('sha256').update(token).digest('hex');

export const generateHashedToken = async (token: string) => hashToken(token);

export const hashRefreshToken = (token: string) => hashToken(token);
