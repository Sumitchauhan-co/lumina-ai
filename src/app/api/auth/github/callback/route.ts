import { createSocialSession } from '@/features/auth/services/social-auth.service';
import {
	getGitHubOAuthConfig,
	githubOAuthStateCookie,
} from '@/features/auth/services/github-oauth';
import { cookieOptions } from '@/features/auth/services/auth.service';
import { timingSafeEqual } from 'node:crypto';
import axios from 'axios';
import { NextResponse, type NextRequest } from 'next/server';

interface GitHubProfile {
	id: number;
	email: string;
	firstName: string;
	lastName: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const getGitHubErrorDetails = (error: unknown) => {
	if (!axios.isAxiosError(error)) {
		return error instanceof Error ? error.message : 'Unknown error';
	}

	const endpoint =
		error.config?.url?.replace(/^https:\/\/[^/]+/, '') || 'GitHub request';
	const responseData: unknown = error.response?.data;
	const responseMessage =
		isRecord(responseData) && typeof responseData.message === 'string'
			? responseData.message
			: '';
	const status = error.response?.status
		? `HTTP ${error.response.status}`
		: 'network error';

	return `${endpoint} failed (${status})${responseMessage ? `: ${responseMessage}` : ''}`;
};

const getGitHubProfile = async (
	accessToken: string,
): Promise<GitHubProfile> => {
	const headers = {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${accessToken}`,
		'User-Agent': 'Lumina AI',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	const [userResponse, emailsResponse] = await Promise.all([
		axios.get<unknown>('https://api.github.com/user', {
			headers: { ...headers, 'Cache-Control': 'no-store' },
		}),
		axios.get<unknown>('https://api.github.com/user/emails', {
			headers: { ...headers, 'Cache-Control': 'no-store' },
		}),
	]);
	const userResult = userResponse.data;
	const emailResult = emailsResponse.data;

	if (
		!isRecord(userResult) ||
		typeof userResult.id !== 'number' ||
		!Number.isSafeInteger(userResult.id) ||
		userResult.id < 1 ||
		typeof userResult.login !== 'string' ||
		!userResult.login.trim() ||
		!Array.isArray(emailResult)
	) {
		throw new Error('GitHub returned an invalid user profile.');
	}

	const verifiedPrimaryEmail = emailResult.find(
		(email): email is Record<string, unknown> =>
			isRecord(email) &&
			typeof email.email === 'string' &&
			email.primary === true &&
			email.verified === true,
	);

	if (
		!verifiedPrimaryEmail ||
		typeof verifiedPrimaryEmail.email !== 'string' ||
		!verifiedPrimaryEmail.email.trim().includes('@')
	) {
		throw new Error('GitHub did not return a verified primary email address.');
	}

	const displayName =
		typeof userResult.name === 'string' && userResult.name.trim()
			? userResult.name.trim()
			: userResult.login.trim();
	const [firstName, ...lastNameParts] = displayName.split(/\s+/);

	return {
		id: userResult.id,
		email: verifiedPrimaryEmail.email.trim().toLowerCase(),
		firstName: firstName || userResult.login,
		lastName: lastNameParts.join(' ') || null,
	};
};

const failedSignIn = (request: NextRequest) => {
	const response = NextResponse.redirect(
		new URL('/oauth/github/error', request.url),
	);
	response.cookies.delete(githubOAuthStateCookie);
	return response;
};

export const GET = async (request: NextRequest) => {
	const query = request.nextUrl.searchParams;
	const state = query.get('state');
	const cookieState = request.cookies.get(githubOAuthStateCookie)?.value;
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
		const { clientId, clientSecret, redirectUri } = getGitHubOAuthConfig();
		const tokenResponse = await axios.post<unknown>(
			'https://github.com/login/oauth/access_token',
			new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
			}),
			{
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
					'Cache-Control': 'no-store',
				},
			},
		);

		const tokenResult = tokenResponse.data;
		if (!isRecord(tokenResult) || typeof tokenResult.access_token !== 'string') {
			throw new Error('GitHub did not return an access token.');
		}

		const profile = await getGitHubProfile(tokenResult.access_token);
		const socialSession = await createSocialSession({
			authId: `github:${profile.id}`,
			email: profile.email,
			firstName: profile.firstName,
			lastName: profile.lastName,
		});
		const response = NextResponse.redirect(
			new URL('/oauth/github/success', request.url),
		);

		response.cookies.delete(githubOAuthStateCookie);
		response.cookies.set(
			'refreshToken',
			socialSession.refreshToken,
			cookieOptions,
		);

		return response;
	} catch (error) {
		console.error('GitHub OAuth callback failed:', getGitHubErrorDetails(error));
		return failedSignIn(request);
	}
};
