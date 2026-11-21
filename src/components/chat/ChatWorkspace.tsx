'use client';

import { Menu, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';
import Chat from '@/components/chat/chat';
import Sidebar from '@/components/chat/ChatSidebar';
import PromptInput, { type LLMModel } from '@/components/chat/PromptInput';
import { ModeToggle } from '@/components/mode-toggle';
import {
	ChatRequestError,
	useEditChatMessage,
	useSendChatMessage,
} from '@/features/chat/hooks/chat';
import { useAuthStore } from '@/store/store';
import api from '@/utils/api';

interface ApiEnvelope<T> {
	success: boolean;
	message?: string;
	data: T;
}

interface ConversationRecord {
	id: string;
	title: string;
	defaultModel: string;
	updatedAt: string;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: string;
	model?: string;
}

export interface ChatItem {
	id: string;
	title: string;
	model: string;
	active?: boolean;
}

export interface ChatHistorySection {
	timeframe: string;
	chats: ChatItem[];
}

interface ChatApiMessage {
	id: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	model: string | null;
	createdAt: string;
}

const AVAILABLE_MODELS: LLMModel[] = [
	{
		id: 'openai/gpt-4o-mini',
		name: 'GPT-4o Mini',
		description: 'Fast answers for everyday tasks.',
		tier: 'Free',
	},
	{
		id: 'openai/gpt-4o',
		name: 'GPT-4o',
		description: 'Flagship reasoning for complex work.',
		tier: 'Pro',
	},
	{
		id: 'anthropic/claude-3.5-haiku',
		name: 'Claude 3.5 Haiku',
		description: 'Quick, capable responses for writing and analysis.',
		tier: 'Pro',
	},
	{
		id: 'google/gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		description: 'Fast multimodal reasoning for complex requests.',
		tier: 'Pro',
	},
];

const formatTime = (value: string | Date) => {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime())
		? ''
		: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toHistory = (
	conversations: ConversationRecord[],
	activeId: string | null,
) => {
	if (!conversations.length) return [];
	return [
		{
			timeframe: 'Recent',
			chats: conversations.map((conversation) => ({
				id: conversation.id,
				title: conversation.title || 'New conversation',
				model: conversation.defaultModel,
				active: conversation.id === activeId,
			})),
		},
	];
};

export default function ChatWorkspace() {
	const router = useRouter();
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const isHydrated = useAuthStore((state) => state.isHydrated);
	const fetchUser = useAuthStore((state) => state.fetchUser);
	const planType = useAuthStore((state) => state.planType);
	const passStatus = useAuthStore((state) => state.passStatus);
	const monthlyTokenAllowance = useAuthStore(
		(state) => state.monthlyTokenAllowance,
	);
	const tokensUsedThisMonth = useAuthStore(
		(state) => state.tokensUsedThisMonth,
	);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [conversations, setConversations] = useState<ConversationRecord[]>([]);
	const [histories, setHistories] = useState<ChatHistorySection[]>([]);
	const [currentChatId, setCurrentChatId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedModel, setSelectedModel] = useState<LLMModel>(
		AVAILABLE_MODELS[0],
	);
	const [inputPrompt, setInputPrompt] = useState('');
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [editingContent, setEditingContent] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [quotaReached, setQuotaReached] = useState(false);
	const [editingChatId, setEditingChatId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');
	const sendChatMessage = useSendChatMessage();
	const editChatMessage = useEditChatMessage();
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const activeRequest = useRef<AbortController | null>(null);

	useEffect(() => {
		const handleExpiredSession = () => {
			clearAuth();
			router.replace('/sign-in');
		};
		window.addEventListener('lumina:auth-expired', handleExpiredSession);
		return () =>
			window.removeEventListener('lumina:auth-expired', handleExpiredSession);
	}, [clearAuth, router]);

	const hasProAccess = planType === 'pro' && passStatus === 'active';
	const availableModels = AVAILABLE_MODELS.map((model) => ({
		...model,
		disabled: model.tier === 'Pro' && !hasProAccess,
	}));

	const updateHistory = useCallback(
		(items: ConversationRecord[], activeId: string | null) => {
			setConversations(items);
			setHistories(toHistory(items, activeId));
		},
		[],
	);

	const loadConversationList = useCallback(
		async (activeId: string | null = null) => {
			const response =
				await api.get<ApiEnvelope<ConversationRecord[]>>('/api/conversations');
			const items = Array.isArray(response.data.data) ? response.data.data : [];
			updateHistory(items, activeId);
			return items;
		},
		[updateHistory],
	);

	const openConversation = useCallback(async (conversationId: string) => {
		activeRequest.current?.abort();
		setEditingMessageId(null);
		setEditingContent('');
		activeRequest.current = null;
		setIsGenerating(false);
		setErrorMessage(null);
		setQuotaReached(false);
		setCurrentChatId(conversationId);
		setMobileMenuOpen(false);
		try {
			const response = await api.get<
				ApiEnvelope<{
					id: string;
					title: string;
					defaultModel: string;
					messages: ChatApiMessage[];
				}>
			>(`/api/conversations/${conversationId}`);
			const conversation = response.data.data;
			setSelectedModel(
				(() => {
					const hasProAccess =
						useAuthStore.getState().planType === 'pro' &&
						useAuthStore.getState().passStatus === 'active';
					const requestedModel = AVAILABLE_MODELS.find(
						(model) => model.id === conversation.defaultModel,
					);
					return requestedModel?.tier === 'Pro' && !hasProAccess
						? AVAILABLE_MODELS[0]
						: (requestedModel ?? AVAILABLE_MODELS[0]);
				})(),
			);
			setMessages(
				(Array.isArray(conversation.messages) ? conversation.messages : [])
					.filter(
						(message) =>
							(message.role === 'user' || message.role === 'assistant') &&
							typeof message.content === 'string',
					)
					.map((message) => ({
						id: message.id,
						role: message.role as Message['role'],
						content: message.content,
						timestamp: formatTime(message.createdAt),
						model: message.model ?? undefined,
					})),
			);
			setHistories((items) =>
				items.map((section) => ({
					...section,
					chats: section.chats.map((chat) => ({
						...chat,
						active: chat.id === conversationId,
					})),
				})),
			);
		} catch {
			setErrorMessage('Could not load this conversation. Please try again.');
		}
	}, []);

	useEffect(() => {
		if (!isHydrated) return;
		let cancelled = false;
		const initialize = async () => {
			try {
				await fetchUser();
				const items = await loadConversationList();
				if (!cancelled && items[0]) await openConversation(items[0].id);
			} catch {
				if (!cancelled) {
					const currentUser = useAuthStore.getState().user;
					if (!currentUser) router.replace('/sign-in');
					else setErrorMessage('Could not load your conversations.');
				}
			}
		};
		void initialize();
		return () => {
			cancelled = true;
			activeRequest.current?.abort();
			activeRequest.current = null;
		};
	}, [fetchUser, isHydrated, loadConversationList, openConversation, router]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isGenerating]);

	const handleNewChat = () => {
		activeRequest.current?.abort();
		setEditingMessageId(null);
		setEditingContent('');
		activeRequest.current = null;
		setCurrentChatId(null);
		setMessages([]);
		setErrorMessage(null);
		setIsGenerating(false);
		setMobileMenuOpen(false);
		setSelectedModel(AVAILABLE_MODELS[0]);
		setHistories(toHistory(conversations, null));
	};

	const handleStopGenerating = useCallback(() => {
		activeRequest.current?.abort();
		activeRequest.current = null;
		setIsGenerating(false);
		if (useAuthStore.getState().user) {
			void useAuthStore
				.getState()
				.fetchUser()
				.catch(() => null);
		}
	}, []);

	const handleSendMessage = async (submittedText: string = inputPrompt) => {
		const content = submittedText.trim();
		if (!content || isGenerating) return;
		const wordCount = content.split(/\s+/u).filter(Boolean).length;
		if (wordCount > 1_000) {
			setErrorMessage('A message can contain up to 1,000 words.');
			return;
		}

		setErrorMessage(null);
		setQuotaReached(false);
		setInputPrompt('');
		setIsGenerating(true);
		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content,
			timestamp: formatTime(new Date()),
		};
		const assistantId = crypto.randomUUID();
		const controller = new AbortController();
		activeRequest.current = controller;
		setMessages((current) => [
			...current,
			userMessage,
			{
				id: assistantId,
				role: 'assistant',
				content: '',
				timestamp: formatTime(new Date()),
				model: selectedModel.id,
			},
		]);

		try {
			await sendChatMessage.mutateAsync({
				...(currentChatId ? { conversationId: currentChatId } : {}),
				content,
				model: selectedModel.id,
				signal: controller.signal,
				onEvent: (event) => {
					if (event.type === 'meta') {
						setCurrentChatId(event.conversationId);
						const title =
							content.length > 52 ? `${content.slice(0, 52)}…` : content;
						const record: ConversationRecord = {
							id: event.conversationId,
							title,
							defaultModel: event.model || selectedModel.id,
							updatedAt: new Date().toISOString(),
						};
						void api
							.patch(`/api/conversations/${record.id}`, { title })
							.catch(() => null);
						const items = [
							record,
							...conversations.filter((item) => item.id !== record.id),
						];
						setConversations(items);
						setHistories(toHistory(items, record.id));
					} else if (event.type === 'delta') {
						setMessages((current) =>
							current.map((message) =>
								message.id === assistantId
									? { ...message, content: message.content + event.content }
									: message,
							),
						);
					}
				},
			});
		} catch (error) {
			if (
				error instanceof Error &&
				['AbortError', 'CanceledError'].includes(error.name)
			)
				return;
			if (
				error instanceof ChatRequestError &&
				error.code === 'MONTHLY_QUOTA_EXCEEDED'
			) {
				setQuotaReached(true);
				setErrorMessage(
					`You have used your ${monthlyTokenAllowance.toLocaleString()} monthly tokens. Upgrade to Pro for a larger allowance.`,
				);
			} else {
				setErrorMessage(
					error instanceof Error ? error.message : 'The AI response failed.',
				);
			}
			setMessages((current) =>
				current.filter(
					(message) => message.id !== assistantId || message.content,
				),
			);
		} finally {
			const wasCurrentRequest = activeRequest.current === controller;
			if (wasCurrentRequest) {
				activeRequest.current = null;
				setIsGenerating(false);
			}
			if (wasCurrentRequest && useAuthStore.getState().user) {
				void useAuthStore
					.getState()
					.fetchUser()
					.catch(() => null);
			}
		}
	};

	const handleStartEditMessage = (message: Message) => {
		setErrorMessage(null);
		setEditingMessageId(message.id);
		setEditingContent(message.content);
	};

	const handleCancelEditMessage = () => {
		setEditingMessageId(null);
		setEditingContent('');
	};

	const handleSaveEditMessage = async () => {
		const content = editingContent.trim();
		if (!currentChatId || !editingMessageId || !content) return;
		if (content.split(/\s+/u).filter(Boolean).length > 1_000) {
			setErrorMessage('A message can contain up to 1,000 words.');
			return;
		}

		setErrorMessage(null);
		try {
			const result = await editChatMessage.mutateAsync({
				conversationId: currentChatId,
				messageId: editingMessageId,
				content,
			});
			const deletedIds = new Set(result.deletedMessageIds);
			setMessages((current) =>
				current
					.filter((message) => !deletedIds.has(message.id))
					.map((message) =>
						message.id === result.prompt.id
							? { ...message, content: result.prompt.content }
							: message,
					),
			);
			handleCancelEditMessage();
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Could not update this prompt.',
			);
		}
	};

	const handleSelectChat = (chatId: string) => void openConversation(chatId);

	const handleDeleteChat = async (event: React.MouseEvent, chatId: string) => {
		event.stopPropagation();
		try {
			await api.delete(`/api/conversations/${chatId}`);
			const items = conversations.filter(
				(conversation) => conversation.id !== chatId,
			);
			const deletingCurrentConversation = currentChatId === chatId;
			updateHistory(items, deletingCurrentConversation ? null : currentChatId);
			if (deletingCurrentConversation) {
				setCurrentChatId(null);
				setMessages([]);
				setSelectedModel(AVAILABLE_MODELS[0]);
			}
		} catch {
			setErrorMessage('Unable to delete this conversation.');
		}
	};

	const handleStartEdit = (event: SyntheticEvent, chat: ChatItem) => {
		event.stopPropagation();
		if (!chat.id) {
			setEditingChatId(null);
			return;
		}
		setEditingChatId(chat.id);
		setEditTitle(chat.title);
	};

	const handleSaveEdit = async (
		event: MouseEvent | KeyboardEvent,
		chatId: string,
	) => {
		event.stopPropagation();
		const title = editTitle.trim();
		if (!title) return;
		try {
			await api.patch(`/api/conversations/${chatId}`, { title });
			const items = conversations.map((conversation) =>
				conversation.id === chatId ? { ...conversation, title } : conversation,
			);
			updateHistory(items, currentChatId);
		} catch {
			setErrorMessage('Unable to rename this conversation.');
		} finally {
			setEditingChatId(null);
		}
	};

	return (
		<div className="flex h-dvh w-full overflow-hidden bg-background font-sans text-foreground antialiased">
			<Sidebar
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				mobileMenuOpen={mobileMenuOpen}
				setMobileMenuOpen={setMobileMenuOpen}
				histories={histories}
				tokenUsage={{ used: tokensUsedThisMonth, limit: monthlyTokenAllowance }}
				handleNewChat={handleNewChat}
				handleSelectChat={handleSelectChat}
				handleStartEdit={handleStartEdit}
				handleSaveEdit={handleSaveEdit}
				handleDeleteChat={handleDeleteChat}
				editingChatId={editingChatId}
				editTitle={editTitle}
				setEditTitle={setEditTitle}
			/>
			<main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
				<header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<button
							type="button"
							onClick={() => setMobileMenuOpen(true)}
							className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
							aria-label="Open conversation history"
						>
							<Menu className="h-5 w-5" />
						</button>
						<span className="truncate text-sm font-semibold sm:text-base">
							{selectedModel.name}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => router.push('/dashboard')}
							className="hidden items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-300 sm:flex"
						>
							<Zap className="h-3.5 w-3.5" /> Upgrade Pro
						</button>
						<ModeToggle />
					</div>
				</header>
				{errorMessage && (
					<div
						role="alert"
						className="mx-4 mt-3 flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive sm:mx-6"
					>
						<span>{errorMessage}</span>
						{quotaReached && (
							<button
								type="button"
								onClick={() => router.push('/dashboard')}
								className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600"
							>
								Upgrade to Pro
							</button>
						)}
					</div>
				)}
				<Chat
					messages={messages}
					isGenerating={isGenerating}
					selectedModel={selectedModel}
					editingMessageId={editingMessageId}
					editingContent={editingContent}
					isSavingEdit={editChatMessage.isPending}
					onStartEdit={handleStartEditMessage}
					onEditingContentChange={setEditingContent}
					onSaveEdit={() => void handleSaveEditMessage()}
					onCancelEdit={handleCancelEditMessage}
					handleSendMessage={(prompt) => void handleSendMessage(prompt)}
					messagesEndRef={messagesEndRef}
				/>
				<PromptInput
					inputPrompt={inputPrompt}
					setInputPrompt={setInputPrompt}
					handleSendMessage={() => void handleSendMessage()}
					handleStopGenerating={handleStopGenerating}
					isGenerating={isGenerating}
					selectedModel={selectedModel}
					models={availableModels}
					onSelectModel={(model) => {
						if (!model.disabled) setSelectedModel(model);
					}}
				/>
			</main>
		</div>
	);
}
