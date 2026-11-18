import React from 'react';
import {
	Plus,
	MessageCircle,
	ChevronDown,
	User,
	Zap,
	Trash2,
	Edit2,
	Check,
	PanelLeftClose,
	PanelLeft,
	Sliders,
	LogOut,
	X,
	CreditCard,
	MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import Lumina from './icon';
import api from '@/utils/api';
import { useAuthStore } from '@/store/store';

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
	handleStartEdit: (e: React.MouseEvent, chat: Chat) => void;
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

	return (
		<>
			{/* Mobile Overlay Backdrop */}
			{mobileMenuOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			<aside
				className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#0c0c0e] border-r border-zinc-800/80
          transition-all duration-300 ease-in-out select-none
          ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}
        `}
			>
				{/* App Logo & Collapse/Expand Trigger */}
				<div
					onClick={() => !sidebarOpen && setSidebarOpen(true)}
					className={`h-14 flex items-center ${sidebarOpen ? 'justify-between px-3.5' : 'justify-center px-3 cursor-pointer'} border-b border-zinc-800/60`}
					title={!sidebarOpen ? 'Expand Sidebar' : undefined}
				>
					<div className="flex items-center gap-3 overflow-hidden">
						<Lumina size="sm" />
						{sidebarOpen && (
							<div className="flex flex-col overflow-hidden transition-all duration-200">
								<span className="font-bold tracking-tight text-sm text-white flex items-center gap-1.5">
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
							className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition shrink-0"
							title="Collapse Sidebar"
						>
							<PanelLeftClose className="h-4 w-4" />
						</button>
					)}

					{!sidebarOpen && (
						<div className="hidden lg:flex absolute left-4 text-zinc-500 opacity-0 hover:opacity-15 transition-opacity pointer-events-none">
							<PanelLeft className="h-4 w-4" />
						</div>
					)}

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setMobileMenuOpen(false);
						}}
						className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* New Chat Button */}
				<div className={`p-2.5 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
					<button
						type="button"
						onClick={handleNewChat}
						className={`
              flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 
              text-white font-medium shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 
              active:scale-[0.98] transition-all duration-150 py-2.5
              ${sidebarOpen ? 'w-full px-3 text-sm' : 'w-11 h-11 px-0 text-xs'}
            `}
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
					className={`flex-1 overflow-y-auto px-2.5 py-1 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 ${!sidebarOpen ? 'cursor-pointer flex flex-col items-center' : ''}`}
				>
					{histories.map((section: HistorySection, idx: number) => (
						<div
							key={idx}
							className={`space-y-0.5 ${!sidebarOpen ? 'w-full flex flex-col items-center' : ''}`}
						>
							{sidebarOpen && (
								<div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase mt-1">
									{section.timeframe}
								</div>
							)}
							{section.chats.map((chat: Chat) => (
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
									className={`
                    group relative flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-sm cursor-pointer transition-all
                    ${!sidebarOpen ? 'justify-center w-11 h-11 p-0' : 'w-full'}
                    ${
											chat.active && sidebarOpen
												? 'bg-zinc-800/90 text-white font-medium border border-zinc-700/50 shadow-sm'
												: 'text-zinc-300 hover:bg-zinc-800/40 hover:text-white'
										}
                  `}
									title={!sidebarOpen ? chat.title : undefined}
								>
									<div className="flex items-center gap-2.5 overflow-hidden flex-1">
										<MessageCircle
											className={`h-4 w-4 shrink-0 ${chat.active && sidebarOpen ? 'text-indigo-400' : 'text-zinc-400'}`}
										/>

										{sidebarOpen && (
											<>
												{editingChatId === chat.id ? (
													<div className="flex items-center gap-1 flex-1 overflow-hidden">
														<input
															type="text"
															value={editTitle}
															onChange={(e) => setEditTitle(e.target.value)}
															onClick={(e) => e.stopPropagation()}
															onKeyDown={(e) =>
																e.key === 'Enter' && handleSaveEdit(e, chat.id)
															}
															className="w-full bg-zinc-900 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white outline-none"
															autoFocus
														/>
														<button
															type="button"
															onClick={(e) => handleSaveEdit(e, chat.id)}
															className="p-1 text-emerald-400 hover:text-emerald-300"
														>
															<Check className="h-3.5 w-3.5" />
														</button>
													</div>
												) : (
													<span className="truncate flex-1 text-xs sm:text-sm">
														{chat.title}
													</span>
												)}
											</>
										)}
									</div>

									{/* Three Dots Popover Menu for Rename & Delete */}
									{sidebarOpen && !editingChatId && (
										<div onClick={(e) => e.stopPropagation()}>
											<Popover>
												<PopoverTrigger
													type="button"
													className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100 outline-none"
													title="Chat Options"
												>
													<MoreHorizontal className="h-4 w-4" />
												</PopoverTrigger>
												<PopoverContent
													side="right"
													align="start"
													className="w-36 bg-zinc-900 border border-zinc-800 text-zinc-200 p-1 rounded-xl shadow-2xl backdrop-blur-xl"
												>
													<button
														type="button"
														onClick={(e) => handleStartEdit(e, chat)}
														className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition text-left"
													>
														<Edit2 className="h-3.5 w-3.5" /> Rename
													</button>
													<button
														type="button"
														onClick={(e) => handleDeleteChat(e, chat.id)}
														className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left"
													>
														<Trash2 className="h-3.5 w-3.5" /> Delete
													</button>
												</PopoverContent>
											</Popover>
										</div>
									)}
								</div>
							))}
						</div>
					))}
				</div>

				{/* Footer & User Menu */}
				<div
					onClick={() => !sidebarOpen && setSidebarOpen(true)}
					className="border-t border-zinc-800/80 bg-zinc-950/40 space-y-2 p-2.5"
				>
					{sidebarOpen && (
						<div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="text-zinc-400 font-medium flex items-center gap-1.5 text-[11px]">
									<Zap className="h-3.5 w-3.5 text-amber-400" /> Token Usage
								</span>
								<span className="text-zinc-200 font-semibold text-[11px]">
									{((tokenUsage.used / tokenUsage.limit) * 100).toFixed(0)}%
								</span>
							</div>
							<div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
								<div
									className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
									style={{
										width: `${(tokenUsage.used / tokenUsage.limit) * 100}%`,
									}}
								/>
							</div>
							<div className="flex justify-between items-center text-[10px] text-zinc-400">
								<span>{tokenUsage.used.toLocaleString()} used</span>
								<span>{tokenUsage.limit.toLocaleString()} max</span>
							</div>
						</div>
					)}

					<div className="w-full">
						<Popover>
							<PopoverTrigger
								className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 transition group outline-none ${!sidebarOpen ? 'justify-center px-0' : ''}`}
								title="User Account"
								onClick={(e) => {
									if (!sidebarOpen) {
										e.stopPropagation();
										setSidebarOpen(true);
									}
								}}
							>
								<div className="flex items-center gap-2.5 overflow-hidden w-full justify-start">
									<div className="relative h-8.5 w-8.5 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 ring-2 ring-indigo-500/30">
										SC
										<span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
									</div>
									{sidebarOpen && (
										<div className="flex flex-col text-left overflow-hidden">
											<span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate group-hover:text-white">
												Sumit Chauhan
											</span>
											<span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
												PRO Plan
											</span>
											</div>
									)}
									{sidebarOpen && (
										<ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
									)}
								</div>
							</PopoverTrigger>

							{sidebarOpen && (
								<PopoverContent
									side="top"
									align="start"
									className="w-64 bg-zinc-900 border border-zinc-800 text-zinc-200 p-1 rounded-xl shadow-2xl backdrop-blur-xl mb-2"
								>
									<button
										type="button"
										className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white rounded-lg transition text-left"
									>
										<User className="h-4 w-4 text-zinc-400" /> Account Settings
									</button>
									<button
										type="button"
										className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white rounded-lg transition text-left"
									>
										<CreditCard className="h-4 w-4 text-zinc-400" /> Billing
									</button>
									<button
										type="button"
										className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white rounded-lg transition text-left"
									>
										<Sliders className="h-4 w-4 text-zinc-400" /> API Key
										Settings
									</button>
									<div className="h-px bg-zinc-800 my-1" />
									<button
										type="button"
										onClick={handleSignOut}
										disabled={isSigningOut}
										className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition text-left"
									>
										<LogOut className="h-4 w-4" />
										{isSigningOut ? 'Signing out…' : 'Log Out'}
									</button>
									{signOutError && (
										<p role="alert" className="px-3 py-1 text-xs text-rose-400">
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
