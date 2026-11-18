'use client';

import React, { useState } from 'react';
import {
	Lock,
	ArrowRight,
	ArrowLeft,
	Loader2,
	CheckCircle2,
	Eye,
	EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Lumina from '@/components/home/icon';

interface ResetPasswordProps {
	token?: string;
	onSubmit?: (newPassword: string) => Promise<void> | void;
}

export default function ResetPassword({ onSubmit }: ResetPasswordProps) {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password.length < 8) {
			setError('Password must be at least 8 characters long.');
			return;
		}

		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		setLoading(true);

		if (onSubmit) {
			await onSubmit(password);
		}

		setTimeout(() => {
			setLoading(false);
			setSuccess(true);
		}, 1200);
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-100 px-4 relative overflow-hidden select-none">
			{/* Background Ambient Glows */}
			<div className="absolute -top-32 -right-32 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-zinc-900/20 rounded-full blur-3xl pointer-events-none" />

			<div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
				{/* Header Brand */}
				<div className="flex flex-col items-center text-center mb-8">
					<Lumina
						size="lg"
						className="mb-3"
					/>
					<h1 className="text-2xl font-bold tracking-tight text-white">
						{success ? 'Password updated' : 'Set new password'}
					</h1>
					<p className="text-xs text-zinc-400 mt-1 max-w-xs">
						{success
							? 'Your password has been reset. You can now sign in with your new credentials.'
							: 'Your new password must be different from previously used passwords'}
					</p>
				</div>

				{success ? (
					<div className="space-y-6">
						<div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
							<CheckCircle2 className="h-8 w-8 text-white" />
							<p className="text-xs text-zinc-300">
								Security credentials updated successfully.
							</p>
						</div>

						<button
							type="button"
							onClick={() => router.push('/sign-in')}
							className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
						>
							<span>Continue to Sign In</span>
							<ArrowRight className="h-4 w-4" />
						</button>
					</div>
				) : (
					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<div>
							<label className="block text-xs font-medium text-zinc-300 mb-1.5">
								New Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
								<input
									type={showPassword ? 'text' : 'password'}
									required
									minLength={8}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="At least 8 characters"
									className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-xs font-medium text-zinc-300 mb-1.5">
								Confirm New Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
								<input
									type={showPassword ? 'text' : 'password'}
									required
									minLength={8}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Repeat new password"
									className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all"
								/>
							</div>
						</div>

						{error && (
							<p className="text-xs text-rose-400 font-medium pt-1">{error}</p>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 cursor-pointer"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<>
									<span>Reset Password</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>
				)}

				{/* Footer Back to Sign In */}
				{!success && (
					<div className="text-center mt-6">
						<Link
							href="/sign-in"
							className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							<span>Back to sign in</span>
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
