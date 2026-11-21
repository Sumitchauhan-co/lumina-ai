'use client';

import axios from 'axios';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';

export function DeleteAccountCard() {
	const router = useRouter();
	const clearAuth = useAuthStore((s) => s.clearAuth);

	const [isConfirming, setIsConfirming] = useState(false);
	const [confirmText, setConfirmText] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const canConfirmDelete = confirmText.trim() === 'DELETE';

	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canConfirmDelete || isDeleting) return;

		setDeleteError(null);
		setIsDeleting(true);

		try {
			await api.delete('/api/user/account');
			clearAuth();
			router.push('/sign-in');
		} catch (err) {
			const message = axios.isAxiosError<{ message?: string; error?: string }>(
				err,
			)
				? err.response?.data?.message ||
					err.response?.data?.error ||
					'Failed to delete account. Please try again.'
				: 'Failed to delete account. Please try again.';
			setDeleteError(message);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Card className="overflow-hidden border-destructive/35 bg-card/95 shadow-xs">
			<CardHeader className="space-y-1.5 border-b border-destructive/20 bg-destructive/5 px-4 py-4 sm:px-6 sm:py-5">
				<div className="flex items-center gap-2">
					<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
					<CardTitle className="text-base font-semibold tracking-tight text-destructive sm:text-lg">
						Delete Account
					</CardTitle>
				</div>
				<CardDescription className="text-xs leading-relaxed sm:text-sm">
					Permanently delete your account, chat history, active subscription
					records, and remaining token quota. This action cannot be undone.
				</CardDescription>
			</CardHeader>

			{isConfirming ? (
				<form onSubmit={handleDeleteAccount}>
					<CardContent className="space-y-4 px-4 py-5 sm:px-6">
						{deleteError && (
							<div
								role="alert"
								className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive sm:text-sm"
							>
								<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
								<span>{deleteError}</span>
							</div>
						)}

						<div className="space-y-1.5">
							<Label
								htmlFor="confirmDelete"
								className="text-xs font-medium text-foreground/90 sm:text-[13px]"
							>
								Type <span className="font-mono font-bold">DELETE</span> to
								confirm permanent account deletion
							</Label>
							<Input
								id="confirmDelete"
								value={confirmText}
								onChange={(e) => setConfirmText(e.target.value)}
								placeholder="DELETE"
								autoComplete="off"
								className="h-10 border-destructive/40 bg-background/70 font-mono text-sm focus-visible:border-destructive sm:h-9"
								disabled={isDeleting}
							/>
						</div>
					</CardContent>

					<CardFooter className="flex flex-col-reverse gap-3 border-t border-destructive/20 bg-destructive/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
						<Button
							type="button"
							variant="outline"
							disabled={isDeleting}
							onClick={() => {
								setIsConfirming(false);
								setConfirmText('');
								setDeleteError(null);
							}}
							className="h-10 w-full cursor-pointer sm:h-9 sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={!canConfirmDelete || isDeleting}
							className="h-10 w-full cursor-pointer gap-2 px-4 font-medium sm:h-9 sm:w-auto"
						>
							{isDeleting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Trash2 className="h-3.5 w-3.5" />
							)}
							<span>
								{isDeleting ? 'Deleting account...' : 'Permanently delete'}
							</span>
						</Button>
					</CardFooter>
				</form>
			) : (
				<CardFooter className="flex flex-col items-stretch justify-between gap-3 bg-muted/10 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
					<p className="text-xs text-muted-foreground sm:text-sm">
						Once deleted, your profile and data cannot be recovered.
					</p>
					<Button
						type="button"
						variant="destructive"
						onClick={() => setIsConfirming(true)}
						className="h-10 w-full shrink-0 cursor-pointer gap-2 px-4 font-medium sm:h-9 sm:w-auto"
					>
						<Trash2 className="h-3.5 w-3.5" />
						<span>Delete account</span>
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
