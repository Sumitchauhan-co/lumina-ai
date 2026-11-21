import {
	getGoogleOAuthConfig,
	googleOAuthStateCookie,
} from '@/features/auth/services/google-oauth';
import { cookieOptions } from '@/features/auth/services/auth.service';
import { createSocialSession } from '@/features/auth/services/social-auth.service';
import { timingSafeEqual } from 'node:crypto';
import axios from 'axios';
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
	const response = await axios.get<unknown>(
		'https://openidconnect.googleapis.com/v1/userinfo',
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Cache-Control': 'no-store',
			},
		},
	);
	const result = response.data;
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
		const tokenResponse = await axios.post<unknown>(
			'https://oauth2.googleapis.com/token',
			new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Cache-Control': 'no-store',
				},
			},
		);

		const tokenResult = tokenResponse.data;
		if (!isRecord(tokenResult) || typeof tokenResult.access_token !== 'string') {
			throw new Error('Google did not return an access token.');
		}

		const profile = await getProfile(tokenResult.access_token);
		const socialSession = await createSocialSession({
			authId: profile.sub,
			email: profile.email,
			firstName: profile.givenName || profile.email.split('@')[0] || 'User',
			lastName: profile.familyName,
		});
		const response = NextResponse.redirect(
			new URL('/oauth/google/success', request.url),
		);

		response.cookies.delete(googleOAuthStateCookie);
		response.cookies.set(
			'refreshToken',
			socialSession.refreshToken,
			cookieOptions,
		);

		return response;
	} catch (error) {
		console.error(
			'Google OAuth callback failed:',
			error instanceof Error ? error.message : 'Unknown error',
		);
		return failedSignIn(request);
	}
};