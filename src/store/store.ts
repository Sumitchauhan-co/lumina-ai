'use client';

import api from '@/utils/api';
import {
	getSharedAccessToken,
	registerAuthSessionBridge,
	setSharedAccessToken,
} from '@/utils/authSession';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type UserRole = 'user' | 'admin' | 'guest';

export interface UserProfile {
	id: string;
	firstName: string;
	lastName: string | null;
	email: string;
	role: UserRole;
}

export interface SubscriptionDetails {
	planType: 'free' | 'pro';
	passStatus: 'inactive' | 'active' | 'expired';
	passExpiryDate?: string | null;
	monthlyTokenAllowance?: number;
	tokensUsedThisMonth?: number;
}

interface AuthenticatedUser extends UserProfile, SubscriptionDetails {
	emailVerified?: boolean;
}

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

interface AuthState {
	isAuthenticated: boolean;
	isHydrated: boolean;
	isFetchingUser: boolean;
	user: UserProfile | null;
	userId: string | null;
	role: UserRole | null;
	planType: 'free' | 'pro';
	passStatus: 'inactive' | 'active' | 'expired';
	passExpiryDate: string | null;
	monthlyTokenAllowance: number;
	tokensUsedThisMonth: number;
	accessToken: string | null;
	setAuthenticated: (
		status: boolean,
		token?: string,
		user?: UserProfile | null,
	) => void;
	setUser: (user: UserProfile | null) => void;
	fetchUser: () => Promise<UserProfile | null>;
	setSubscriptionDetails: (details: SubscriptionDetails) => void;
	setHasHydrated: (status: boolean) => void;
	clearAuth: () => void;
}

const DEFAULT_SUBSCRIPTION_STATE = {
	planType: 'free' as const,
	passStatus: 'inactive' as const,
	passExpiryDate: null,
	monthlyTokenAllowance: 1_000,
	tokensUsedThisMonth: 0,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const isUserRole = (value: unknown): value is UserRole =>
	value === 'user' || value === 'admin' || value === 'guest';

const isPlanType = (value: unknown): value is SubscriptionDetails['planType'] =>
	value === 'free' || value === 'pro';

const isPassStatus = (
	value: unknown,
): value is SubscriptionDetails['passStatus'] =>
	value === 'inactive' || value === 'active' || value === 'expired';

const toUserProfile = (value: unknown): UserProfile | null => {
	const candidate = asRecord(value);
	if (
		!candidate ||
		typeof candidate.id !== 'string' ||
		typeof candidate.email !== 'string'
	) {
		return null;
	}

	return {
		id: candidate.id,
		firstName: typeof candidate.firstName === 'string' ? candidate.firstName : '',
		lastName:
			typeof candidate.lastName === 'string' || candidate.lastName === null
				? candidate.lastName
				: null,
		email: candidate.email,
		role: isUserRole(candidate.role) ? candidate.role : 'user',
	};
};

export const useAuthStore = create<AuthState>()(
	devtools(
		persist(
			(set, get) => ({
				isAuthenticated: false,
				isHydrated: false,
				isFetchingUser: false,
				user: null,
				userId: null,
				role: null,
				...DEFAULT_SUBSCRIPTION_STATE,
				accessToken: null,

				setHasHydrated: (status) =>
					set({ isHydrated: status }, false, 'auth/setHasHydrated'),

				setUser: (user) =>
					set(
						{
							user,
							userId: user?.id ?? null,
							role: user?.role ?? null,
						},
						false,
						'auth/setUser',
					),

				fetchUser: async () => {
					set({ isFetchingUser: true }, false, 'auth/fetchUser_Start');
					try {
						const response =
							await api.get<ApiEnvelope<AuthenticatedUser>>('/api/auth/getUser');
						const data = response.data.data;
						const profile = toUserProfile(data);
						if (!profile) {
							throw new Error('Current-user endpoint returned an invalid profile');
						}

						set(
							(state) => ({
								isAuthenticated: true,
								user: profile,
								userId: profile.id,
								role: profile.role,
								planType: data.planType,
								passStatus: data.passStatus,
								passExpiryDate: data.passExpiryDate ?? null,
								monthlyTokenAllowance:
									data.monthlyTokenAllowance ??
									state.monthlyTokenAllowance,
								tokensUsedThisMonth:
									data.tokensUsedThisMonth ?? state.tokensUsedThisMonth,
							}),
							false,
							'auth/fetchUser_Success',
						);
						return profile;
					} finally {
						set({ isFetchingUser: false }, false, 'auth/fetchUser_Finish');
					}
				},

				setAuthenticated: (status, token, user) => {
					if (!status) {
						setAccessToken(null);
						set(
							{
								isAuthenticated: false,
								isFetchingUser: false,
								user: null,
								userId: null,
								role: null,
								...DEFAULT_SUBSCRIPTION_STATE,
								accessToken: null,
							},
							false,
							'auth/setAuthenticated_LoggedOut',
						);
						return;
					}

					const nextToken =
						token ?? getSharedAccessToken() ?? get().accessToken;
					if (nextToken) setAccessToken(nextToken);

					set(
						(state) => {
							const resolvedUser =
								user === undefined ? state.user : user;
							return {
								isAuthenticated: true,
								user: resolvedUser,
								userId: resolvedUser?.id ?? null,
								role: resolvedUser?.role ?? null,
								accessToken: nextToken ?? state.accessToken,
							};
						},
						false,
						'auth/setAuthenticated',
					);
				},

				setSubscriptionDetails: (details) =>
					set((state) => ({ ...state, ...details }), false, 'auth/setSubscriptionDetails'),

				clearAuth: () => {
					setAccessToken(null);
					set(
						{
							isAuthenticated: false,
							isFetchingUser: false,
							user: null,
							userId: null,
							role: null,
							...DEFAULT_SUBSCRIPTION_STATE,
							accessToken: null,
						},
						false,
						'auth/clearAuth',
					);
				},
			}),
			{
				name: 'auth-storage',
				partialize: (state) => ({
					isAuthenticated: state.isAuthenticated,
					user: state.user,
					userId: state.userId,
					role: state.role,
					planType: state.planType,
					passStatus: state.passStatus,
					passExpiryDate: state.passExpiryDate,
					monthlyTokenAllowance: state.monthlyTokenAllowance,
					tokensUsedThisMonth: state.tokensUsedThisMonth,
				}),
				onRehydrateStorage: () => (state) => {
					if (state?.accessToken) setAccessToken(null);
					else setSharedAccessToken(null);
					state?.setHasHydrated(true);
				},
			},
		),
	),
);

export const setAccessToken = (token: string | null) => {
	setSharedAccessToken(token);
	useAuthStore.setState({ accessToken: token });
};

export const getAccessToken = () =>
	useAuthStore.getState().accessToken ?? getSharedAccessToken();

registerAuthSessionBridge({
	onRefreshed: (token, userData) => {
		const userRecord = asRecord(userData);
		const profile = toUserProfile(userRecord?.user ?? userData);
		useAuthStore.getState().setAuthenticated(true, token, profile ?? undefined);

		if (!userRecord) return;
		const updates: Partial<AuthState> = {};
		if (isPlanType(userRecord.planType)) updates.planType = userRecord.planType;
		if (isPassStatus(userRecord.passStatus)) {
			updates.passStatus = userRecord.passStatus;
		}
		if (
			typeof userRecord.passExpiryDate === 'string' ||
			userRecord.passExpiryDate === null
		) {
			updates.passExpiryDate = userRecord.passExpiryDate;
		}
		if (typeof userRecord.monthlyTokenAllowance === 'number') {
			updates.monthlyTokenAllowance = userRecord.monthlyTokenAllowance;
		}
		if (typeof userRecord.tokensUsedThisMonth === 'number') {
			updates.tokensUsedThisMonth = userRecord.tokensUsedThisMonth;
		}
		useAuthStore.setState(updates);
	},
	onExpired: () => useAuthStore.getState().clearAuth(),
});
