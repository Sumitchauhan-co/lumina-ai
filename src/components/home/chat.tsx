import React, { useState } from 'react';
import {
	ChevronRight,
	Code,
	Database,
	Sliders,
	Cpu,
	Copy,
	Check,
	Bot,
} from 'lucide-react';
import Lumina from './icon';

interface PromptStarter {
	type: 'code' | 'database' | 'sliders' | 'cpu';
	title: string;
	desc: string;
	prompt: string;
}

const PROMPT_STARTERS: PromptStarter[] = [
	{
		type: 'code',
		title: 'Write Next.js Server Action',
		desc: 'Create a safe mutation action with Zod validation & revalidation',
		prompt:
			'Write a production-ready Next.js App Router Server Action with Zod input validation and revalidatePath.',
	},
	{
		type: 'database',
		title: 'Explain pgvector RAG',
		desc: 'How to store embeddings & run cosine similarity in Postgres',
		prompt:
			'Explain how to store vector embeddings using pgvector extension in PostgreSQL and perform cosine similarity search.',
	},
	{
		type: 'sliders',
		title: 'OpenRouter Model Switcher',
		desc: 'Configure Vercel AI SDK to switch models dynamically',
		prompt:
			'Show me how to setup Vercel AI SDK with OpenRouter to switch dynamically between GPT-4o and Claude 3.5 Sonnet.',
	},
	{
		type: 'cpu',
		title: 'Razorpay Subscriptions',
		desc: 'Handle webhook events for upgrading user to Pro plan',
		prompt:
			'Draft a Next.js API route handler to process Razorpay subscription authorization webhooks and update user status in PostgreSQL.',
	},
];

interface StarterIconProps {
	type: string;
}

function StarterIcon({ type }: StarterIconProps) {
	switch (type) {
		case 'code':
			return <Code className="h-4 w-4" />;
		case 'database':
			return <Database className="h-4 w-4" />;
		case 'sliders':
			return <Sliders className="h-4 w-4" />;
		case 'cpu':
			return <Cpu className="h-4 w-4" />;
		default:
			return <Code className="h-4 w-4" />;
	}
}

interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	model?: string;
	timestamp: string;
}

interface SelectedModel {
	id: string;
	name: string;
}

interface ChatProps {
	messages: Message[];
	isGenerating: boolean;
	selectedModel: SelectedModel;
	handleSendMessage: (prompt: string) => void;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function Chat({
	messages,
	isGenerating,
	selectedModel,
	handleSendMessage,
	messagesEndRef,
}: ChatProps) {
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const handleCopy = (content: string, id: string) => {
		navigator.clipboard.writeText(content);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	return (
		<div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
			{messages.length === 0 ? (
				<div className="max-w-3xl mx-auto py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
					<div className="text-center space-y-3">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
							<Lumina className="h-6 w-6" /> Lumina AI
						</div>
						<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
							Good evening,{' '}
							<span className="bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
								Sumit
							</span>
						</h1>
						<p className="text-sm text-zinc-400 max-w-lg mx-auto">
							What would you like to build or analyze today? Select a prompt
							starter below or type your custom query.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						{PROMPT_STARTERS.map((starter: PromptStarter, idx: number) => (
							<button
								key={idx}
								onClick={() => handleSendMessage(starter.prompt)}
								className="group p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 hover:bg-zinc-900 transition-all text-left space-y-2 flex flex-col justify-between"
							>
								<div className="flex items-center justify-between">
									<div className="p-2 rounded-xl bg-zinc-800 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
										<StarterIcon type={starter.type} />
									</div>
									<ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
								</div>
								<div>
									<h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
										{starter.title}
									</h3>
									<p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
										{starter.desc}
									</p>
								</div>
							</button>
						))}
					</div>
				</div>
			) : (
				<div className="max-w-3xl mx-auto space-y-8 pb-6">
					{messages.map((msg: Message) => (
						<div
							key={msg.id}
							className="w-full"
						>
							{msg.role === 'user' ? (
								/* User Prompt: Uniformly rounded container aligned to the right, timestamp below */
								<div className="flex flex-col items-end space-y-1">
									<div className="max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 text-sm sm:text-base leading-relaxed shadow-sm bg-linear-to-r from-indigo-600 to-violet-600 text-white">
										<div className="whitespace-pre-wrap font-sans">
											{msg.content}
										</div>
									</div>
									<div className="text-[11px] text-zinc-500 pr-1">
										{msg.timestamp}
									</div>
								</div>
							) : (
								/* AI Message: Not wrapped in a container, copy on the left, model/timestamp on the right */
								<div className="flex flex-col space-y-3 text-zinc-200 text-sm sm:text-base leading-relaxed">
									<div className="whitespace-pre-wrap font-sans">
										{msg.content}
									</div>

									<div className="flex items-center justify-between pt-1 border-zinc-800/80 text-xs text-zinc-400">
										<button
											onClick={() => handleCopy(msg.content, msg.id)}
											className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition text-xs"
											title="Copy AI Message"
										>
											{copiedId === msg.id ? (
												<>
													<Check className="h-3.5 w-3.5 text-zinc-300" />
													<span className="text-zinc-300">Copied</span>
												</>
											) : (
												<>
													<Copy className="h-3.5 w-3.5 text-zinc-400" />
													<span>Copy</span>
												</>
											)}
										</button>

										<div className="flex items-center gap-3">
											<span className="font-mono text-indigo-400 text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
												{msg.model || selectedModel.id}
											</span>
											<span>{msg.timestamp}</span>
										</div>
									</div>
								</div>
							)}
						</div>
					))}

					{isGenerating && (
						<div className="flex items-center gap-3 text-zinc-400 text-sm py-2 animate-pulse">
							<div className="h-7 w-7 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
								<Bot className="h-4 w-4 animate-spin" />
							</div>
							<span>
								Generating streaming response via {selectedModel.name}...
							</span>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>
			)}
		</div>
	);
}
