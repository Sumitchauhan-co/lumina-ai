import {
	getGoogleOAuthConfig,
	googleOAuthStateCookie,
} from '@/features/auth/services/google-oauth';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export const GET = () => {
	try {
		const { clientId, redirectUri } = getGoogleOAuthConfig();
		const state = randomBytes(32).toString('hex');
		const authorizationUrl = new URL(
			'https://accounts.google.com/o/oauth2/v2/auth',
		);

		authorizationUrl.search = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: 'code',
			scope: 'openid email profile',
			state,
		}).toString();

		const response = NextResponse.redirect(authorizationUrl);
		response.cookies.set(googleOAuthStateCookie, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 10 * 60,
		});

		return response;
	} catch (error) {
		console.error('Unable to start Google OAuth:', error);
		return NextResponse.json(
			{ message: 'Google sign-in is not configured.' },
			{ status: 500 },
		);
	}
};
