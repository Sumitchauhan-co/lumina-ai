'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import Lumina from '@/components/home/icon';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import { useAuthStore } from '@/store/store';
import axios from 'axios';

interface AuthUser {
	planType?: 'free' | 'pro';
	passStatus?: 'inactive' | 'active' | 'expired';
	monthlyTokenAllowance?: number;
	tokensUsedThisMonth?: number;
	tokensUsedToday?: number;
}

export default function SignIn() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
	const setSubscriptionDetails = useAuthStore(
		(state) => state.setSubscriptionDetails,
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setErrorMessage('');

		try {
			const response = await api.post<{
				data: { accessToken: string; user: AuthUser };
			}>('/api/auth/signin', { email, password });
			const { accessToken, user } = response.data.data;

			setAuthenticated(true, accessToken);
			setSubscriptionDetails({
				planType: user.planType ?? 'free',
				passStatus: user.passStatus ?? 'inactive',
				monthlyTokenAllowance: user.monthlyTokenAllowance,
				tokensUsedThisMonth: user.tokensUsedThisMonth,
				tokensUsedToday: user.tokensUsedToday,
			});
			router.replace('/');
		} catch (error) {
			setErrorMessage(
				axios.isAxiosError<{ message?: string }>(error)
					? (error.response?.data?.message ??
							'Unable to sign in. Please try again.')
					: 'Unable to sign in. Please try again.',
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-100 px-4 relative overflow-hidden select-none">
			{/* Background Ambient Glows */}
			<div className="absolute -top-32 -left-32 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-32 -right-32 w-96 h-96 bg-zinc-900/20 rounded-full blur-3xl pointer-events-none" />

			<div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
				{/* Header Brand */}
				<div className="flex flex-col items-center text-center mb-8">
					<Lumina
						size="lg"
						className="mb-3"
					/>
					<h1 className="text-2xl font-bold tracking-tight text-white">
						Welcome back to Lumina
					</h1>
					<p className="text-xs text-zinc-400 mt-1">
						Sign in to your multi-LLM AI workspace
					</p>
				</div>

				{/* High-Contrast White OAuth Buttons */}
				<div className="grid grid-cols-2 gap-3 mb-6">
					<button
						type="button"
						disabled
						title="GitHub sign-in is not configured"
						className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white text-zinc-950 font-semibold text-xs shadow-sm opacity-50 cursor-not-allowed"
					>
						<svg
							className="h-4 w-4 fill-current"
							viewBox="0 0 24 24"
						>
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
						</svg>
						<span>GitHub</span>
					</button>

					<a
						href="/api/auth/google"
						className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white text-zinc-950 font-semibold text-xs shadow-sm hover:bg-zinc-200 active:scale-[0.98] transition-all"
					>
						<svg
							className="h-4 w-4"
							viewBox="0 0 24 24"
						>
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
							/>
						</svg>
						<span>Google</span>
					</a>
				</div>

				<div className="relative flex items-center justify-center mb-6">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-zinc-800" />
					</div>
					<span className="relative px-3 bg-zinc-950 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
						or continue with email
					</span>
				</div>

				{/* Sign In Form */}
				<form
					onSubmit={handleSubmit}
					className="space-y-4"
				>
					{errorMessage && (
						<p
							role="alert"
							className="text-sm text-rose-400"
						>
							{errorMessage}
						</p>
					)}
					<div>
						<label className="block text-xs font-medium text-zinc-300 mb-1.5">
							Email Address
						</label>
						<div className="relative">
							<Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="example@gmail.com"
								className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all"
							/>
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="block text-xs font-medium text-zinc-300">
								Password
							</label>
							<button
								type="button"
								onClick={() => router.push('/forgot-password')}
								className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
							>
								Forgot password?
							</button>
						</div>
						<div className="relative">
							<Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
							<input
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••••••"
								className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 cursor-pointer"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<span>Sign In</span>
								<ArrowRight className="h-4 w-4" />
							</>
						)}
					</button>
				</form>

				{/* Footer Toggle */}
				<div className="text-center mt-6">
					<p className="text-xs text-zinc-400">
						{`Don't have an account? `}
						<button
							type="button"
							onClick={() => router.push('/sign-up')}
							className="text-white font-semibold hover:underline transition-colors cursor-pointer"
						>
							Sign up
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
