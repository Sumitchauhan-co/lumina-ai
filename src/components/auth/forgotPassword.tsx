'use client';

import React, { useState } from 'react';
import {
	Mail,
	ArrowRight,
	ArrowLeft,
	Loader2,
	CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Lumina from '@/components/icon';

interface ForgotPasswordProps {
	onSubmit?: (email: string) => Promise<void> | void;
}

export default function ForgotPassword({ onSubmit }: ForgotPasswordProps) {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		if (onSubmit) {
			await onSubmit(email);
		}

		setTimeout(() => {
			setLoading(false);
			setSubmitted(true);
		}, 1200);
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden select-none">
			{/* Background Ambient Glows */}
			<div className="absolute -top-32 -left-32 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-32 -right-32 w-96 h-96 bg-muted/50 rounded-full blur-3xl pointer-events-none" />

			<div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
				{/* Header Brand */}
				<div className="flex flex-col items-center text-center mb-8">
					<Lumina
						size="lg"
						className="mb-3"
					/>
					<h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
						{submitted ? 'Check your email' : 'Reset your password'}
					</h1>
					<p className="text-xs text-muted-foreground mt-1 max-w-xs">
						{submitted
							? `We sent a password reset link to ${email}`
							: 'Enter the email address associated with your account and we will send you a reset link'}
					</p>
				</div>

				{submitted ? (
					<div className="space-y-6">
						<div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/70 border border-border text-center space-y-2">
							<CheckCircle2 className="h-8 w-8 text-foreground dark:text-white" />
							<p className="text-xs text-foreground/80">
								Didn&apos;t receive the email? Check your spam folder or try
								another address.
							</p>
						</div>

						<button
							type="button"
							onClick={() => setSubmitted(false)}
							className="w-full py-2.5 px-4 rounded-xl bg-foreground text-background dark:bg-white dark:text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-foreground/90 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all cursor-pointer"
						>
							Try another email
						</button>
					</div>
				) : (
					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
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

						<button
							type="submit"
							disabled={loading}
							className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 px-4 rounded-xl bg-[#2563EB] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 cursor-pointer"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<>
									<span>Send Reset Link</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>
				)}

				{/* Footer Back to Sign In */}
				<div className="text-center mt-6">
					<Link
						href="/sign-in"
						className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground dark:text-white font-medium transition-colors"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						<span>Back to sign in</span>
					</Link>
				</div>
			</div>
		</div>
	);
}
