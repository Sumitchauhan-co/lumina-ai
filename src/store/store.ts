import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { tokenPayload } from '../utils/token';

interface AuthState {
	isAuthenticated: boolean;
	isHydrated: boolean; // Hydration tracking flag for local storage
	userId: string | null;
	role: string | null;
	planType: 'free' | 'pro';
	passStatus: 'inactive' | 'active' | 'expired';
	monthlyTokenAllowance: number;
	tokensUsedThisMonth: number;
	tokensUsedToday: number;
	accessToken: string | null;

	// Actions
	setAuthenticated: (status: boolean, token?: string) => void;
	setSubscriptionDetails: (details: {
		planType: 'free' | 'pro';
		passStatus: 'inactive' | 'active' | 'expired';
		monthlyTokenAllowance?: number;
		tokensUsedThisMonth?: number;
		tokensUsedToday?: number;
	}) => void;
	setHasHydrated: (status: boolean) => void;
	clearAuth: () => void;
}

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
	accessToken = token;
	useAuthStore.setState((state) => ({ ...state, accessToken: token }));
};
export const getAccessToken = () =>
	useAuthStore.getState().accessToken ?? accessToken;

export const useAuthStore = create<AuthState>()(
	devtools(
		persist(
			(set) => ({
				isAuthenticated: false,
				isHydrated: false,
				userId: null,
				role: null,
				planType: 'free',
				passStatus: 'inactive',
				monthlyTokenAllowance: 1000000,
				tokensUsedThisMonth: 0,
				tokensUsedToday: 0,
				accessToken: null,

				setHasHydrated: (status: boolean) =>
					set({ isHydrated: status }, false, 'auth/setHasHydrated'),

				setAuthenticated: (status, token) => {
					if (status) {
						const nextToken = token ?? getAccessToken();

						if (nextToken) {
							try {
								setAccessToken(nextToken);
								const decoded = jwtDecode<
									tokenPayload & {
										planType?: 'free' | 'pro';
										passStatus?: 'inactive' | 'active' | 'expired';
										monthlyTokenAllowance?: number;
										tokensUsedThisMonth?: number;
										tokensUsedToday?: number;
									}
								>(nextToken);

								set(
									{
										isAuthenticated: true,
										userId: decoded.id,
										role: decoded.role,
										planType: decoded.planType ?? 'free',
										passStatus: decoded.passStatus ?? 'inactive',
										monthlyTokenAllowance:
											decoded.monthlyTokenAllowance ?? 1000000,
										tokensUsedThisMonth: decoded.tokensUsedThisMonth ?? 0,
										tokensUsedToday: decoded.tokensUsedToday ?? 0,
										accessToken: nextToken,
									},
									false,
									'auth/setAuthenticated_Success',
								);
								return;
							} catch (error) {
								console.error('Failed to decode token context payload:', error);
							}
						}
					}

					if (!status) {
						setAccessToken(null);
						set(
							{
								isAuthenticated: false,
								userId: null,
								role: null,
								planType: 'free',
								passStatus: 'inactive',
								monthlyTokenAllowance: 1000000,
								tokensUsedThisMonth: 0,
								tokensUsedToday: 0,
								accessToken: null,
							},
							false,
							'auth/setAuthenticated_StatusOnly',
						);
						return;
					}

					set(
						(state) => ({ ...state, isAuthenticated: true }),
						false,
						'auth/setAuthenticated_StatusOnly',
					);
				},

				setSubscriptionDetails: (details) =>
					set(
						(state) => ({ ...state, ...details }),
						false,
						'auth/setSubscriptionDetails',
					),

				clearAuth: () => {
					setAccessToken(null);
					set(
						{
							isAuthenticated: false,
							userId: null,
							role: null,
							planType: 'free',
							passStatus: 'inactive',
							monthlyTokenAllowance: 1000000,
							tokensUsedThisMonth: 0,
							tokensUsedToday: 0,
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
					userId: state.userId,
					role: state.role,
					planType: state.planType,
					passStatus: state.passStatus,
					monthlyTokenAllowance: state.monthlyTokenAllowance,
					tokensUsedThisMonth: state.tokensUsedThisMonth,
					tokensUsedToday: state.tokensUsedToday,
					accessToken: state.accessToken,
				}),
				onRehydrateStorage: () => (state) => {
					state?.setHasHydrated(true);
				},
			},
		),
	),
);
