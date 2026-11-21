export interface AuthSessionBridge {
	onRefreshed?: (accessToken: string, user: unknown) => void;
	onExpired?: () => void;
}

let accessToken: string | null = null;
let authSessionBridge: AuthSessionBridge | null = null;

export const getSharedAccessToken = () => accessToken;

export const setSharedAccessToken = (token: string | null) => {
	accessToken = token;
};

export const registerAuthSessionBridge = (bridge: AuthSessionBridge) => {
	authSessionBridge = bridge;
};

export const notifyAuthSessionRefreshed = (
	token: string,
	user: unknown,
) => {
	authSessionBridge?.onRefreshed?.(token, user);
};

export const notifyAuthSessionExpired = () => {
	authSessionBridge?.onExpired?.();
};
