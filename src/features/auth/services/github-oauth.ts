export const githubOAuthStateCookie = 'githubOAuthState';

export const getGitHubOAuthConfig = () => {
	const clientId = process.env.GITHUB_CLIENT_ID;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('GitHub OAuth credentials are not configured.');
	}

	return {
		clientId,
		clientSecret,
		redirectUri:
			process.env.GITHUB_REDIRECT_URI ||
			'http://localhost:3000/api/auth/github/callback',
	};
};
