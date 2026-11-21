'use client';

import {
	ChevronDown,
	CreditCard,
	Edit2,
	LogOut,
	MessageCircle,
	MoreHorizontal,
	PanelLeft,
	PanelLeftClose,
	Plus,
	Trash2,
	User,
	X,
	Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';
import Lumina from '../icon';

interface Chat {
	id: string;
	title: string;
	model: string;
	active?: boolean;
}

interface HistorySection {
	timeframe: string;
	chats: Chat[];
}

interface TokenUsage {
	used: number;
	limit: number;
}

interface SidebarProps {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	mobileMenuOpen: boolean;
	setMobileMenuOpen: (open: boolean) => void;
	histories: HistorySection[];
	tokenUsage: TokenUsage;
	handleNewChat: () => void;
	handleSelectChat: (id: string) => void;
	handleStartEdit: (e: React.SyntheticEvent, chat: Chat) => void;
	handleSaveEdit: (
		e: React.MouseEvent | React.KeyboardEvent,
		id: string,
	) => void;
	handleDeleteChat: (e: React.MouseEvent, id: string) => void;
	editingChatId: string | null;
	editTitle: string;
	setEditTitle: (title: string) => void;
}

export default function Sidebar({
	sidebarOpen,
	setSidebarOpen,
	mobileMenuOpen,
	setMobileMenuOpen,
	histories,
	tokenUsage,
	handleNewChat,
	handleSelectChat,
	handleStartEdit,
	handleSaveEdit,
	handleDeleteChat,
	editingChatId,
	editTitle,
	setEditTitle,
}: SidebarProps) {
	const router = useRouter();
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState('');
	const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
	const [pendingDeleteChat, setPendingDeleteChat] = useState<Chat | null>(null);

	const { user, planType } = useAuthStore();

	const userInitials =
		[user?.firstName?.[0], user?.lastName?.[0]]
			.filter((initial): initial is string => Boolean(initial))
			.join('')
			.toUpperCase() || 'U';

	const handleSignOut = async () => {
		setIsSigningOut(true);
		setSignOutError('');

		try {
			await api.post('/api/auth/signout');
			clearAuth();
			router.replace('/sign-in');
		} catch (error) {
			console.error('Unable to sign out:', error);
			setSignOutError('Unable to sign out. Please try again.');
			setIsSigningOut(false);
		}
	};

	const closeRenamePopover = (e?: React.SyntheticEvent) => {
		e?.stopPropagation();
		setEditTitle('');
		handleStartEdit(
			e ?? ({ stopPropagation: () => {} } as unknown as React.MouseEvent),
			{ id: '', title: '', model: '' },
		);
		setOpenMenuChatId(null);
	};

	return (
		<>
			{/* Mobile Overlay Backdrop */}
			{mobileMenuOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity lg:hidden"
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/80 bg-sidebar transition-all duration-300 ease-in-out select-none lg:static ${mobileMenuOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'} `}
			>
				{/* App Logo & Collapse/Expand Trigger */}
				<div
					onClick={() => !sidebarOpen && setSidebarOpen(true)}
					className={`flex h-14 items-center ${sidebarOpen ? 'justify-between px-3.5' : 'cursor-pointer justify-center px-3'} border-b border-border/60`}
					title={!sidebarOpen ? 'Expand Sidebar' : undefined}
				>
					<div className="flex items-center gap-3 overflow-hidden">
						<Lumina size="sm" />
						{sidebarOpen && (
							<div className="flex flex-col overflow-hidden transition-all duration-200">
								<span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-foreground dark:text-white">
									Lumina AI
								</span>
							</div>
						)}
					</div>

					{sidebarOpen && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setSidebarOpen(false);
							}}
							className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800/80 dark:hover:text-white lg:flex"
							title="Collapse Sidebar"
						>
							<PanelLeftClose className="h-4 w-4" />
						</button>
					)}

					{!sidebarOpen && (
						<div className="pointer-events-none absolute left-4 hidden text-muted-foreground opacity-0 transition-opacity hover:opacity-15 lg:flex">
							<PanelLeft className="h-4 w-4" />
						</div>
					)}

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setMobileMenuOpen(false);
						}}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 dark:hover:text-white lg:hidden"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* New Chat Button */}
				<div className={`p-2.5 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
					<button
						type="button"
						onClick={handleNewChat}
						className={`flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 py-2.5 font-medium text-white shadow-md shadow-indigo-600/20 transition-all duration-150 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] ${sidebarOpen ? 'w-full px-3 text-sm' : 'h-11 w-11 px-0 text-xs'} `}
						title="New Conversation"
					>
						<Plus className="h-4 w-4 shrink-0" />
						{sidebarOpen && (
							<span className="text-sm font-semibold">New Conversation</span>
						)}
					</button>
				</div>

				{/* Chat History List */}
				<div
					onClick={() => !sidebarOpen && setSidebarOpen(true)}
					className={`scrollbar-thin scrollbar-thumb-zinc-800 flex-1 space-y-2 overflow-y-auto px-2.5 py-1 ${!sidebarOpen ? 'flex cursor-pointer flex-col items-center' : ''}`}
				>
					{histories.map((section: HistorySection, idx: number) => (
						<div
							key={idx}
							className={`space-y-0.5 ${!sidebarOpen ? 'flex w-full flex-col items-center' : ''}`}
						>
							{sidebarOpen && (
								<div className="mt-1 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
									{section.timeframe}
								</div>
							)}
							{section.chats.map((chat: Chat) => {
								const isMenuOpen = openMenuChatId === chat.id;
								const isRenamingThisChat = editingChatId === chat.id;

								return (
									<div
										key={chat.id}
										onClick={(e) => {
											e.stopPropagation();
											if (!sidebarOpen) {
												setSidebarOpen(true);
											} else {
												handleSelectChat(chat.id);
											}
										}}
										className={`group relative flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all ${!sidebarOpen ? 'h-11 w-11 justify-center p-0' : 'w-full'} ${
											chat.active && sidebarOpen
												? 'border border-border bg-accent font-medium text-accent-foreground shadow-sm dark:bg-zinc-800/90 dark:text-white'
												: 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800/40 dark:hover:text-white'
										} `}
										title={!sidebarOpen ? chat.title : undefined}
									>
										<div className="flex flex-1 items-center justify-center gap-2.5 overflow-hidden">
											<MessageCircle
												className={`h-4 w-4 shrink-0 ${chat.active && sidebarOpen ? 'text-indigo-400' : 'text-muted-foreground'}`}
											/>

											{sidebarOpen && (
												<span className="flex-1 truncate text-xs sm:text-sm">
													{chat.title}
												</span>
											)}
										</div>

										{/* Three Dots Popover Menu for Rename & Delete */}
										{sidebarOpen && (
											<div onClick={(e) => e.stopPropagation()}>
												<Popover
													open={isMenuOpen}
													onOpenChange={(nextOpen) => {
														setOpenMenuChatId(nextOpen ? chat.id : null);
														if (!nextOpen && isRenamingThisChat) {
															closeRenamePopover();
														}
													}}
												>
													<PopoverTrigger
														type="button"
														className={`rounded-lg p-1 text-muted-foreground transition outline-none hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800 dark:hover:text-white ${
															isMenuOpen
																? 'bg-muted text-foreground opacity-100 dark:bg-zinc-800 dark:text-white'
																: 'opacity-0 group-hover:opacity-100'
														}`}
														title="Chat Options"
													>
														<MoreHorizontal className="h-4 w-4" />
													</PopoverTrigger>

													<PopoverContent
														side="right"
														align="start"
														sideOffset={8}
														className={`${
															isRenamingThisChat
																? 'w-88 border-0 p-5 ring-0 outline-none focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none'
																: 'w-36 border border-border p-1'
														} rounded-2xl bg-card text-foreground shadow-2xl backdrop-blur-xl dark:bg-zinc-900 dark:text-zinc-200`}
													>
														{isRenamingThisChat ? (
															<div
																className="space-y-4"
																onClick={(e) => e.stopPropagation()}
															>
																<div className="space-y-2">
																	<label
																		htmlFor={`rename-chat-${chat.id}`}
																		className="block text-sm font-semibold text-foreground dark:text-white"
																	>
																		Rename Conversation
																	</label>
																	<input
																		id={`rename-chat-${chat.id}`}
																		type="text"
																		value={editTitle}
																		onChange={(e) =>
																			setEditTitle(e.target.value)
																		}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') {
																				handleSaveEdit(e, chat.id);
																				setOpenMenuChatId(null);
																			} else if (e.key === 'Escape') {
																				closeRenamePopover(e);
																			}
																		}}
																		placeholder="Enter conversation name"
																		className="w-full rounded-xl border-0 bg-muted/80 px-3.5 py-2.5 text-sm text-foreground shadow-none ring-0 outline-none focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none dark:bg-zinc-950/90 dark:text-white"
																		autoFocus
																	/>
																</div>

																<div className="flex items-center justify-end gap-2.5 pt-1">
																	<Button
																		type="button"
																		variant="ghost"
																		size="default"
																		onClick={(e) => closeRenamePopover(e)}
																		className="border-0 px-4 py-2 text-sm font-medium text-muted-foreground shadow-none ring-0 outline-none hover:bg-muted hover:text-foreground focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none dark:hover:bg-zinc-800 dark:hover:text-white"
																	>
																		Cancel
																	</Button>
																	<Button
																		type="button"
																		size="default"
																		disabled={!editTitle.trim()}
																		onClick={(e) => {
																			handleSaveEdit(e, chat.id);
																			setOpenMenuChatId(null);
																		}}
																		className="border-0 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-none ring-0 outline-none hover:bg-indigo-500 focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none"
																	>
																		Okay
																	</Button>
																</div>
															</div>
														) : (
															<>
																<button
																	type="button"
																	onClick={(e) => handleStartEdit(e, chat)}
																	className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground transition hover:bg-muted hover:text-foreground dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
																>
																	<Edit2 className="h-3.5 w-3.5" /> Rename
																</button>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		setOpenMenuChatId(null);
																		setPendingDeleteChat(chat);
																	}}
																	className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-rose-400 transition hover:bg-rose-500/10"
																>
																	<Trash2 className="h-3.5 w-3.5" /> Delete
																</button>
															</>
														)}
													</PopoverContent>
												</Popover>
											</div>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>

				{/* Delete Confirmation Alert Dialog */}
				<AlertDialog
					open={Boolean(pendingDeleteChat)}
					onOpenChange={(open) => {
						if (!open) setPendingDeleteChat(null);
					}}
				>
					<AlertDialogContent onClick={(e) => e.stopPropagation()}>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete conversation?</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete{' '}
								<span className="font-semibold text-foreground">
									{pendingDeleteChat?.title || 'this conversation'}
								</span>
								? This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setPendingDeleteChat(null)}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={(e) => {
									if (pendingDeleteChat) {
										handleDeleteChat(e, pendingDeleteChat.id);
									}
									setPendingDeleteChat(null);
								}}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Footer & User Menu */}
				<div
					onClick={() => !sidebarOpen && setSidebarOpen(true)}
					className="space-y-2 border-t border-border/80 bg-sidebar p-2.5"
				>
					{sidebarOpen && (
						<div className="space-y-1.5 rounded-xl border border-border/80 bg-card p-2.5 dark:bg-zinc-900/60">
							<div className="flex items-center justify-between text-xs">
								<span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
									<Zap className="h-3.5 w-3.5 text-amber-400" /> Token Usage
								</span>
								<span className="text-[11px] font-semibold text-foreground dark:text-zinc-200">
									{((tokenUsage.used / tokenUsage.limit) * 100).toFixed(0)}%
								</span>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-zinc-800">
								<div
									className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-300"
									style={{
										width: `${(tokenUsage.used / tokenUsage.limit) * 100}%`,
									}}
								/>
							</div>
							<div className="flex items-center justify-between text-[10px] text-muted-foreground">
								<span>{tokenUsage.used.toLocaleString()} used</span>
								<span>{tokenUsage.limit.toLocaleString()} max</span>
							</div>
						</div>
					)}

					<div className="w-full">
						<Popover>
							<PopoverTrigger
								className={`group flex w-full items-center justify-between rounded-xl p-2 transition outline-none hover:bg-muted dark:hover:bg-zinc-800/60 ${!sidebarOpen ? 'justify-center px-0' : ''}`}
								title="User Account"
								onClick={(e) => {
									if (!sidebarOpen) {
										e.stopPropagation();
										setSidebarOpen(true);
									}
								}}
							>
								<div className="flex w-full items-center justify-between overflow-hidden px-3">
									<div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-indigo-500/30">
										{userInitials}
										<span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
									</div>
									{sidebarOpen && (
										<div className="flex flex-col overflow-hidden text-left">
											<span className="truncate text-xs font-semibold text-foreground group-hover:text-foreground sm:text-sm dark:text-zinc-100 dark:group-hover:text-white">
												{`${user?.firstName} ${user?.lastName}`}
											</span>
											<span className="flex items-center gap-1 text-[11px] font-medium text-indigo-400">
												{`${planType.toUpperCase()} Plan`}
											</span>
										</div>
									)}
									{sidebarOpen && (
										<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
									)}
								</div>
							</PopoverTrigger>

							{sidebarOpen && (
								<PopoverContent
									side="top"
									align="start"
									className="mb-2 w-64 rounded-xl border border-border bg-card p-1 text-foreground shadow-2xl backdrop-blur-xl dark:bg-zinc-900 dark:text-zinc-200"
								>
									<button
										type="button"
										className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-foreground transition hover:bg-muted hover:text-foreground dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
									>
										<User className="h-4 w-4 text-muted-foreground" /> Account
										Settings
									</button>
									<button
										type="button"
										onClick={() => router.push('/dashboard')}
										className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-foreground transition hover:bg-muted hover:text-foreground dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
									>
										<CreditCard className="h-4 w-4 text-muted-foreground" />{' '}
										Billing
									</button>
									<div className="my-1 h-px bg-muted dark:bg-zinc-800" />
									<button
										type="button"
										onClick={handleSignOut}
										disabled={isSigningOut}
										className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-rose-400 transition hover:bg-rose-500/10"
									>
										<LogOut className="h-4 w-4" />
										{isSigningOut ? 'Signing out…' : 'Log Out'}
									</button>
									{signOutError && (
										<p
											role="alert"
											className="px-3 py-1 text-xs text-rose-400"
										>
											{signOutError}
										</p>
									)}
								</PopoverContent>
							)}
						</Popover>
					</div>
				</div>
			</aside>
		</>
	);
}
