'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import Lumina from '@/components/icon';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
	type SubscriptionDetails,
	type UserProfile,
	useAuthStore,
} from '@/store/store';
import axios from 'axios';

type AuthUser = UserProfile & SubscriptionDetails;

export default function SignUp() {
	const router = useRouter();
	const [name, setName] = useState('');
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

		const [firstName, ...lastNameParts] = name.trim().split(/\s+/);

		try {
			const response = await api.post<{
				data: { accessToken: string; user: AuthUser };
			}>('/api/auth/signup', {
				firstName,
				lastName: lastNameParts.join(' ') || undefined,
				email,
				password,
			});
			const { accessToken, user } = response.data.data;

			setAuthenticated(true, accessToken, user);
			setSubscriptionDetails({
				planType: user.planType ?? 'free',
				passStatus: user.passStatus ?? 'inactive',
				monthlyTokenAllowance: user.monthlyTokenAllowance,
				tokensUsedThisMonth: user.tokensUsedThisMonth,
			});
			router.replace('/');
		} catch (error) {
			setErrorMessage(
				axios.isAxiosError<{ message?: string }>(error)
					? (error.response?.data?.message ??
							'Unable to create your account. Please try again.')
					: 'Unable to create your account. Please try again.',
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden select-none">
			{/* Background Ambient Glows */}
			<div className="absolute -top-32 -right-32 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-muted/50 rounded-full blur-3xl pointer-events-none" />

			<div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
				{/* Header Brand */}
				<div className="flex flex-col items-center text-center mb-8">
					<Lumina
						size="lg"
						className="mb-3"
					/>
					<h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
						Create your Lumina account
					</h1>
					<p className="text-xs text-muted-foreground mt-1">
						Get started with your multi-LLM AI workspace
					</p>
				</div>

				{/* High-Contrast White OAuth Buttons */}
				<div className="grid grid-cols-2 gap-3 mb-6">
					<a
						href="/api/auth/github"
						className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-foreground text-background dark:bg-white dark:text-zinc-950 font-semibold text-xs shadow-sm hover:bg-foreground/90 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all"
					>
						<svg
							className="h-4 w-4 fill-current"
							viewBox="0 0 24 24"
						>
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
						</svg>
						<span>GitHub</span>
					</a>

					<a
						href="/api/auth/google"
						className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-foreground text-background dark:bg-white dark:text-zinc-950 font-semibold text-xs shadow-sm hover:bg-foreground/90 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all"
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
						<div className="w-full border-t border-border" />
					</div>
					<span className="relative px-3 bg-card text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
						or sign up with email
					</span>
				</div>

				{/* Sign Up Form */}
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
						<label className="block text-xs font-medium text-foreground/80 mb-1.5">
							Full Name
						</label>
						<div className="relative">
							<User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="John Doe"
								className="w-full bg-background/70 border border-border rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-medium text-foreground/80 mb-1.5">
							Email Address
						</label>
						<div className="relative">
							<Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="example@gmail.com"
								className="w-full bg-background/70 border border-border rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-medium text-foreground/80 mb-1.5">
							Password
						</label>
						<div className="relative">
							<Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
							<input
								type="password"
								required
								minLength={8}
								pattern="(?=.*[A-Z])(?=.*[0-9]).*"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="At least 8 characters"
								className="w-full bg-background/70 border border-border rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<span>Create Account</span>
								<ArrowRight className="h-4 w-4" />
							</>
						)}
					</button>
				</form>

				{/* Footer Toggle */}
				<div className="text-center mt-6">
					<p className="text-xs text-muted-foreground">
						Already have an account?{' '}
						<button
							type="button"
							onClick={() => router.push('/sign-in')}
							className="text-foreground dark:text-white font-semibold hover:underline transition-colors"
						>
							Sign in
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
