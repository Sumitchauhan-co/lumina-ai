'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
import {
	useDeleteAccount,
	useUpdateProfile,
} from '@/features/dashboard/hooks/dashboard';

export function AccountSettingsPanel() {
	const user = useAuthStore((s) => s.user);

	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [confirmText, setConfirmText] = useState('');

	const { updateProfile, isSaving, message, error, clearFeedback } =
		useUpdateProfile();

	const { deleteAccount, isDeleting, deleteError, clearDeleteError } =
		useDeleteAccount('/sign-in');

	useEffect(() => {
		if (user) {
			setFirstName(user.firstName ?? '');
			setLastName(user.lastName ?? '');
		}
	}, [user]);

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		await updateProfile({
			firstName,
			lastName: lastName || null,
		});
	};

	const canConfirmDelete = confirmText.trim() === 'DELETE';

	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canConfirmDelete || isDeleting) return;
		await deleteAccount();
	};

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 px-1 sm:space-y-6 sm:px-0">
			<Card className="overflow-hidden border-border/80 bg-card/95 shadow-xs">
				<form onSubmit={handleSaveProfile}>
					<CardHeader className="space-y-1.5 border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
								Profile Information
							</CardTitle>
							{user?.role && (
								<span className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
									{user.role}
								</span>
							)}
						</div>
						<CardDescription className="text-xs leading-relaxed sm:text-sm">
							Update your display name. Your email and role are managed by your
							account record.
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">
						{message && (
							<div
								role="status"
								className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-400 sm:text-sm"
							>
								<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
								<span>{message}</span>
							</div>
						)}

						{error && (
							<div
								role="alert"
								className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive sm:text-sm"
							>
								<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
								<span>{error}</span>
							</div>
						)}

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
							<div className="space-y-1.5">
								<Label
									htmlFor="firstName"
									className="text-xs font-medium text-foreground/90 sm:text-[13px]"
								>
									First name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="firstName"
									value={firstName}
									onChange={(e) => {
										clearFeedback();
										setFirstName(e.target.value);
									}}
									placeholder="Enter first name"
									className="h-10 bg-background/70 transition-colors focus-visible:bg-background sm:h-9"
									required
								/>
							</div>

							<div className="space-y-1.5">
								<Label
									htmlFor="lastName"
									className="text-xs font-medium text-foreground/90 sm:text-[13px]"
								>
									Last name
								</Label>
								<Input
									id="lastName"
									value={lastName}
									onChange={(e) => {
										clearFeedback();
										setLastName(e.target.value);
									}}
									placeholder="Enter last name"
									className="h-10 bg-background/70 transition-colors focus-visible:bg-background sm:h-9"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between gap-2">
								<Label
									htmlFor="email"
									className="text-xs font-medium text-foreground/90 sm:text-[13px]"
								>
									Email
								</Label>
								<span className="text-[11px] text-muted-foreground">
									Read-only
								</span>
							</div>
							<Input
								id="email"
								type="email"
								value={user?.email ?? ''}
								disabled
								readOnly
								className="h-10 cursor-not-allowed bg-muted/40 text-muted-foreground opacity-85 sm:h-9"
							/>
						</div>
					</CardContent>

					<CardFooter className="flex flex-col-reverse gap-3 border-t border-border/60 bg-muted/15 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
						<p className="text-center text-xs text-muted-foreground sm:text-left">
							Changes apply immediately to your workspace profile.
						</p>
						<Button
							type="submit"
							disabled={isSaving}
							className="h-10 w-full cursor-pointer gap-2 px-4 font-medium shadow-xs transition-all sm:h-9 sm:w-auto"
						>
							{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
							<span>{isSaving ? 'Saving...' : 'Save changes'}</span>
						</Button>
					</CardFooter>
				</form>
			</Card>

			<Card className="overflow-hidden border-destructive/35 bg-card/95 shadow-xs">
				<CardHeader className="space-y-1.5 border-b border-destructive/20 bg-destructive/5 px-4 py-4 sm:px-6 sm:py-5">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
						<CardTitle className="text-base font-semibold tracking-tight text-destructive sm:text-lg">
							Delete Account
						</CardTitle>
					</div>
					<CardDescription className="text-xs leading-relaxed sm:text-sm">
						Permanently delete your account, chat history, subscription records,
						and monthly token quota. This action cannot be undone.
					</CardDescription>
				</CardHeader>

				{isConfirmingDelete ? (
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
									onChange={(e) => {
										clearDeleteError();
										setConfirmText(e.target.value);
									}}
									placeholder="DELETE"
									autoComplete="off"
									disabled={isDeleting}
									className="h-10 border-destructive/40 bg-background/70 font-mono text-sm focus-visible:border-destructive sm:h-9"
								/>
							</div>
						</CardContent>

						<CardFooter className="flex flex-col-reverse gap-3 border-t border-destructive/20 bg-destructive/5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
							<Button
								type="button"
								variant="outline"
								disabled={isDeleting}
								onClick={() => {
									setIsConfirmingDelete(false);
									setConfirmText('');
									clearDeleteError();
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
							Once deleted, your profile and workspace data cannot be recovered.
						</p>
						<Button
							type="button"
							variant="destructive"
							onClick={() => setIsConfirmingDelete(true)}
							className="h-10 w-full shrink-0 cursor-pointer gap-2 px-4 font-medium sm:h-9 sm:w-auto"
						>
							<Trash2 className="h-3.5 w-3.5" />
							<span>Delete account</span>
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
