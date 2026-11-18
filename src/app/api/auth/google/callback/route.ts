import { getDb } from '@/db';
import { usersTable } from '@/db/auth.schema';
import {
	getGoogleOAuthConfig,
	googleOAuthStateCookie,
} from '@/features/auth/services/google-oauth';
import { generateRefreshToken } from '@/utils/token';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

interface GoogleProfile {
	sub: string;
	email: string;
	givenName: string | null;
	familyName: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const getProfile = async (accessToken: string): Promise<GoogleProfile> => {
	const response = await fetch(
		'https://openidconnect.googleapis.com/v1/userinfo',
		{
			headers: { Authorization: `Bearer ${accessToken}` },
			cache: 'no-store',
		},
	);

	if (!response.ok) {
		throw new Error(
			`Google profile request failed with status ${response.status}.`,
		);
	}

	const result: unknown = await response.json();
	if (
		!isRecord(result) ||
		typeof result.sub !== 'string' ||
		!result.sub ||
		typeof result.email !== 'string' ||
		!result.email.trim().includes('@') ||
		result.email_verified !== true
	) {
		throw new Error('Google did not return a verified email address.');
	}

	return {
		sub: result.sub,
		email: result.email.trim().toLowerCase(),
		givenName: typeof result.given_name === 'string' ? result.given_name : null,
		familyName:
			typeof result.family_name === 'string' ? result.family_name : null,
	};
};

const createSession = async (profile: GoogleProfile) => {
	const db = getDb();

	return db.transaction(async (tx) => {
		let [user] = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.authId, profile.sub))
			.limit(1);

		if (!user) {
			[user] = await tx
				.select()
				.from(usersTable)
				.where(sql`LOWER(${usersTable.email}) = ${profile.email}`)
				.limit(1);
		}

		if (user?.authId && user.authId !== profile.sub) {
			throw new Error('This email is already linked to another social account.');
		}

		if (!user) {
			const [createdUser] = await tx
				.insert(usersTable)
				.values({
					authId: profile.sub,
					firstName: profile.givenName || profile.email.split('@')[0] || 'User',
					lastName: profile.familyName,
					email: profile.email,
					emailVerified: true,
				})
				.onConflictDoNothing()
				.returning();

			user = createdUser;
		}

		if (!user) {
			[user] = await tx
				.select()
				.from(usersTable)
				.where(eq(usersTable.authId, profile.sub))
				.limit(1);

			if (!user) {
				[user] = await tx
					.select()
					.from(usersTable)
					.where(sql`LOWER(${usersTable.email}) = ${profile.email}`)
					.limit(1);
			}
		}

		if (!user) {
			throw new Error('Unable to create or locate the Google account.');
		}
		if (user.authId && user.authId !== profile.sub) {
			throw new Error('This email is already linked to another social account.');
		}

		if (!user.authId || !user.emailVerified) {
			const [linkedUser] = await tx
				.update(usersTable)
				.set({ authId: profile.sub, emailVerified: true })
				.where(
					and(
						eq(usersTable.id, user.id),
						or(
							isNull(usersTable.authId),
							eq(usersTable.authId, profile.sub),
						),
					),
				)
				.returning();

			if (!linkedUser) {
				throw new Error('This email is already linked to another social account.');
			}
			user = linkedUser;
		}

		const refreshToken = await generateRefreshToken({
			id: user.id,
			role: user.role,
		});

		const [sessionUser] = await tx
			.update(usersTable)
			.set({ refreshToken })
			.where(eq(usersTable.id, user.id))
			.returning({
				id: usersTable.id,
				firstName: usersTable.firstName,
				lastName: usersTable.lastName,
				email: usersTable.email,
				role: usersTable.role,
				emailVerified: usersTable.emailVerified,
				planType: usersTable.planType,
				passStatus: usersTable.passStatus,
				passExpiryDate: usersTable.passExpiryDate,
				monthlyTokenAllowance: usersTable.monthlyTokenAllowance,
				tokensUsedThisMonth: usersTable.tokensUsedThisMonth,
				tokensUsedToday: usersTable.tokensUsedToday,
				refreshToken: usersTable.refreshToken,
				createdAt: usersTable.createdAt,
			});

		const sessionRefreshToken = sessionUser?.refreshToken;
		if (!sessionUser || !sessionRefreshToken) {
			throw new Error('Unable to create the Google sign-in session.');
		}

		return { ...sessionUser, refreshToken: sessionRefreshToken };
	});
};

const failedSignIn = (request: NextRequest) => {
	const response = NextResponse.redirect(
		new URL('/oauth/google/error', request.url),
	);
	response.cookies.delete(googleOAuthStateCookie);
	return response;
};

export const GET = async (request: NextRequest) => {
	const query = request.nextUrl.searchParams;
	const state = query.get('state');
	const cookieState = request.cookies.get(googleOAuthStateCookie)?.value;
	const code = query.get('code');
	const stateBytes = Buffer.from(state ?? '');
	const cookieStateBytes = Buffer.from(cookieState ?? '');

	if (
		query.has('error') ||
		!state ||
		!cookieState ||
		!/^[a-f0-9]{64}$/.test(state) ||
		!/^[a-f0-9]{64}$/.test(cookieState) ||
		stateBytes.length !== cookieStateBytes.length ||
		!timingSafeEqual(stateBytes, cookieStateBytes) ||
		!code
	) {
		return failedSignIn(request);
	}

	try {
		const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
			cache: 'no-store',
		});

		if (!tokenResponse.ok) {
			throw new Error(
				`Google token exchange failed with status ${tokenResponse.status}.`,
			);
		}

		const tokenResult: unknown = await tokenResponse.json();
		if (!isRecord(tokenResult) || typeof tokenResult.access_token !== 'string') {
			throw new Error('Google did not return an access token.');
		}

		const profile = await getProfile(tokenResult.access_token);
		const user = await createSession(profile);
		const response = NextResponse.redirect(
			new URL('/oauth/google/success', request.url),
		);

		response.cookies.delete(googleOAuthStateCookie);
		response.cookies.set('refreshToken', user.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
		});

		return response;
	} catch (error) {
		console.error(
			'Google OAuth callback failed:',
			error instanceof Error ? error.message : 'Unknown error',
		);
		return failedSignIn(request);
	}
};