import {
	getGitHubOAuthConfig,
	githubOAuthStateCookie,
} from '@/features/auth/services/github-oauth';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export const GET = () => {
	try {
		const { clientId, redirectUri } = getGitHubOAuthConfig();
		const state = randomBytes(32).toString('hex');
		const authorizationUrl = new URL(
			'https://github.com/login/oauth/authorize',
		);

		authorizationUrl.search = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			scope: 'read:user user:email',
			state,
		}).toString();

		const response = NextResponse.redirect(authorizationUrl);
		response.cookies.set(githubOAuthStateCookie, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 10 * 60,
		});

		return response;
	} catch (error) {
		console.error('Unable to start GitHub OAuth:', error);
		return NextResponse.json(
			{ message: 'GitHub sign-in is not configured.' },
			{ status: 500 },
		);
	}
};
