'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Zap } from 'lucide-react';
import Sidebar from '@/components/home/sidebar';
import Chat from '@/components/home/chat';
import PromptInput from '@/components/home/prompt';

// --- TypeScript Interfaces ---
export interface LLMModel {
	id: string;
	name: string;
	provider: string;
	badge: string;
	tier: string;
	color: string;
	iconColor: string;
	description: string;
	speed: string;
	context: string;
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

// Available LLM Models Configuration
const LLM_MODELS: LLMModel[] = [
	{
		id: 'openai/gpt-4o-mini',
		name: 'GPT-4o Mini',
		provider: 'OpenAI',
		badge: 'Fast & Lightweight',
		tier: 'Free',
		color: 'from-emerald-500 to-teal-500',
		iconColor: 'text-emerald-400',
		description: 'Great for everyday tasks, fast answers, and general queries.',
		speed: '⚡⚡⚡ Fast',
		context: '128k',
	},
	{
		id: 'openai/gpt-4o',
		name: 'GPT-4o',
		provider: 'OpenAI',
		badge: 'Flagship Intelligence',
		tier: 'Pro',
		color: 'from-indigo-500 to-violet-500',
		iconColor: 'text-indigo-400',
		description:
			'High-reasoning omni-model for complex code, logic, and synthesis.',
		speed: '⚡⚡ Balanced',
		context: '128k',
	},
	{
		id: 'anthropic/claude-3.5-sonnet',
		name: 'Claude 3.5 Sonnet',
		provider: 'Anthropic',
		badge: 'Best for Coding',
		tier: 'Pro',
		color: 'from-amber-500 to-orange-500',
		iconColor: 'text-amber-400',
		description: 'Unmatched nuance, complex coding, and structured analysis.',
		speed: '⚡⚡ Balanced',
		context: '200k',
	},
];

// Initial Chat History Mock
const INITIAL_HISTORIES: ChatHistorySection[] = [
	{
		timeframe: 'Today',
		chats: [
			{
				id: '1',
				title: 'Next.js Server Actions with Drizzle',
				model: 'openai/gpt-4o',
				active: true,
			},
			{
				id: '2',
				title: 'Razorpay Webhook verification handler',
				model: 'openai/gpt-4o-mini',
				active: false,
			},
		],
	},
	{
		timeframe: 'Yesterday',
		chats: [
			{
				id: '3',
				title: 'pgvector Cosine Similarity queries',
				model: 'anthropic/claude-3.5-sonnet',
				active: false,
			},
			{
				id: '4',
				title: 'OpenRouter streamText API setup',
				model: 'openai/gpt-4o-mini',
				active: false,
			},
		],
	},
	{
		timeframe: 'Previous 7 Days',
		chats: [
			{
				id: '5',
				title: 'Shadcn UI sidebar layout structure',
				model: 'openai/gpt-4o',
				active: false,
			},
			{
				id: '6',
				title: 'Auth.js JWT session middleware',
				model: 'openai/gpt-4o-mini',
				active: false,
			},
		],
	},
];

export default function HomePage() {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const [selectedModel] = useState<LLMModel>(LLM_MODELS[0]);
	const [histories, setHistories] =
		useState<ChatHistorySection[]>(INITIAL_HISTORIES);
	const [currentChatId, setCurrentChatId] = useState('1');
	const [messages, setMessages] = useState<Message[]>([
		{
			id: 'm-1',
			role: 'user',
			content:
				'How do I set up OpenRouter streaming in Next.js App Router with Vercel AI SDK?',
			timestamp: '10:42 AM',
		},
		{
			id: 'm-2',
			role: 'assistant',
			model: 'openai/gpt-4o',
			content: `Here is a complete setup using the Vercel AI SDK (\`ai\` package) configured with OpenRouter:

\`\`\`typescript
// app/api/chat/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  const result = await streamText({
    model: openrouter(model || 'openai/gpt-4o-mini'),
    messages,
  });

  return result.toDataStreamResponse();
}
\`\`\`

You can pass the selected model string directly from your client components!`,
			timestamp: '10:42 AM',
		},
	]);

	const [inputPrompt, setInputPrompt] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);
	const [tokenUsage, setTokenUsage] = useState({ used: 4280, limit: 100000 });
	const [editingChatId, setEditingChatId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState('');

	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isGenerating]);

	const handleNewChat = () => {
		const newId = Date.now().toString();
		const newChat: ChatItem = {
			id: newId,
			title: 'New Conversation',
			model: selectedModel.id,
			active: true,
		};

		setHistories((prev) => [
			{
				...prev[0],
				chats: [
					newChat,
					...prev[0].chats.map((c) => ({ ...c, active: false })),
				],
			},
			...prev.slice(1).map((section) => ({
				...section,
				chats: section.chats.map((c) => ({ ...c, active: false })),
			})),
		]);

		setCurrentChatId(newId);
		setMessages([]);
		setMobileMenuOpen(false);
	};

	const handleSelectChat = (chatId: string) => {
		setCurrentChatId(chatId);
		setHistories((prev) =>
			prev.map((section) => ({
				...section,
				chats: section.chats.map((c) => ({
					...c,
					active: c.id === chatId,
				})),
			})),
		);
		setMobileMenuOpen(false);
	};

	const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
		e.stopPropagation();
		setHistories((prev) =>
			prev.map((section) => ({
				...section,
				chats: section.chats.filter((c) => c.id !== chatId),
			})),
		);
		if (currentChatId === chatId) {
			handleNewChat();
		}
	};

	const handleStartEdit = (e: React.MouseEvent, chat: ChatItem) => {
		e.stopPropagation();
		setEditingChatId(chat.id);
		setEditTitle(chat.title);
	};

	const handleSaveEdit = (
		e: React.MouseEvent | React.KeyboardEvent,
		chatId: string,
	) => {
		e.stopPropagation();
		if (editTitle.trim()) {
			setHistories((prev) =>
				prev.map((section) => ({
					...section,
					chats: section.chats.map((c) =>
						c.id === chatId ? { ...c, title: editTitle.trim() } : c,
					),
				})),
			);
		}
		setEditingChatId(null);
	};

	const handleSendMessage = (textToSend: string = inputPrompt) => {
		if (!textToSend.trim() || isGenerating) return;

		const userMessage: Message = {
			id: `msg-${Date.now()}`,
			role: 'user',
			content: textToSend,
			timestamp: new Date().toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			}),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputPrompt('');
		setIsGenerating(true);

		if (messages.length === 0) {
			const firstTitle =
				textToSend.length > 30
					? textToSend.substring(0, 30) + '...'
					: textToSend;
			setHistories((prev) =>
				prev.map((section) => ({
					...section,
					chats: section.chats.map((c) =>
						c.id === currentChatId ? { ...c, title: firstTitle } : c,
					),
				})),
			);
		}

		setTimeout(() => {
			const assistantMessage: Message = {
				id: `msg-${Date.now() + 1}`,
				role: 'assistant',
				model: selectedModel.id,
				content: `I've received your query regarding: "${textToSend}"\n\nExecuted via **${selectedModel.name}** through OpenRouter gateway. Streaming tokens live into your Next.js App Router application!`,
				timestamp: new Date().toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				}),
			};
			setMessages((prev) => [...prev, assistantMessage]);
			setIsGenerating(false);
			setTokenUsage((prev) => ({ ...prev, used: prev.used + 180 }));
		}, 1200);
	};

	return (
		<div className="flex h-screen w-full bg-[#09090b] text-zinc-100 font-sans antialiased overflow-hidden">
			{/* 1. SIDEBAR */}
			<Sidebar
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				mobileMenuOpen={mobileMenuOpen}
				setMobileMenuOpen={setMobileMenuOpen}
				histories={histories}
				tokenUsage={tokenUsage}
				handleNewChat={handleNewChat}
				handleSelectChat={handleSelectChat}
				handleStartEdit={handleStartEdit}
				handleSaveEdit={handleSaveEdit}
				handleDeleteChat={handleDeleteChat}
				editingChatId={editingChatId}
				editTitle={editTitle}
				setEditTitle={setEditTitle}
			/>

			{/* MAIN CONTENT AREA */}
			<main className="flex-1 flex flex-col h-full bg-[#09090b] relative overflow-hidden">
				{/* HEADER NAVBAR */}
				<header className="h-16 border-b border-zinc-800/70 bg-[#09090b]/80 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
					<div className="flex items-center gap-3">
						<button
							onClick={() => setMobileMenuOpen(true)}
							className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
						>
							<Menu className="h-5 w-5" />
						</button>
					</div>

					<div className="flex items-center gap-3">
						<button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition">
							<Zap className="h-3.5 w-3.5" /> Upgrade Pro
						</button>
					</div>
				</header>

				{/* 2. CHAT VIEW */}
				<Chat
					messages={messages}
					isGenerating={isGenerating}
					selectedModel={selectedModel}
					handleSendMessage={handleSendMessage}
					messagesEndRef={messagesEndRef}
				/>

				{/* 3. PROMPT INPUT */}
				<PromptInput
					inputPrompt={inputPrompt}
					setInputPrompt={setInputPrompt}
					handleSendMessage={() => handleSendMessage()}
					isGenerating={isGenerating}
					selectedModel={selectedModel}
				/>
			</main>
		</div>
	);
}
