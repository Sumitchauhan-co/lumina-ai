'use client';

import { code } from '@streamdown/code';
import {
	Bot,
	Check,
	ChevronRight,
	Code,
	Copy,
	Cpu,
	Database,
	Pencil,
	Sliders,
} from 'lucide-react';
import React, { useState } from 'react';
import { Streamdown } from 'streamdown';
import { useAuthStore } from '@/store/store';
import Lumina from '../icon';

interface PromptStarter {
	type: 'code' | 'database' | 'sliders' | 'cpu';
	title: string;
	desc: string;
	prompt: string;
}

const PROMPT_STARTERS: PromptStarter[] = [
	{
		type: 'code',
		title: 'Draft a Clear Email or Message',
		desc: 'Rewrite rough thoughts into a polite, concise note',
		prompt:
			'Help me write a clear, polite, and concise email or message. Ask me who it is for and what point I want to get across.',
	},
	{
		type: 'database',
		title: 'Summarize Notes or Articles',
		desc: 'Pull out key points, action items, and takeaways',
		prompt:
			'Summarize long notes or text into short bullet points with clear key takeaways and next steps.',
	},
	{
		type: 'sliders',
		title: 'Plan My Day or To-Do List',
		desc: 'Organize tasks by priority with realistic time blocks',
		prompt:
			'Help me organize my daily tasks into a practical priority list with simple time blocks.',
	},
	{
		type: 'cpu',
		title: 'Explain Anything Simply',
		desc: 'Break down a topic in plain language with examples',
		prompt:
			'Explain a topic in simple, everyday language with a quick real-world example—no jargon.',
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
	editingMessageId: string | null;
	editingContent: string;
	isSavingEdit: boolean;
	onStartEdit: (message: Message) => void;
	onEditingContentChange: (content: string) => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	handleSendMessage: (prompt: string) => void;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function Chat({
	messages,
	isGenerating,
	selectedModel,
	editingMessageId,
	editingContent,
	isSavingEdit,
	onStartEdit,
	onEditingContentChange,
	onSaveEdit,
	onCancelEdit,
	handleSendMessage,
	messagesEndRef,
}: ChatProps) {
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const handleCopy = async (content: string, id: string) => {
		await navigator.clipboard.writeText(content);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const user = useAuthStore((s) => s.user);

	return (
		<div className="scrollbar-thin scrollbar-thumb-zinc-800 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
			{messages.length === 0 ? (
				<div className="animate-in fade-in mx-auto max-w-3xl space-y-8 py-8 duration-300 sm:py-12">
					<div className="space-y-3 text-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
							<Lumina className="h-6 w-6" /> Lumina AI
						</div>
						<h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl dark:text-white">
							Good evening,{' '}
							<span className="bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
								{user?.firstName || 'Unknown'}
							</span>
						</h1>
						<p className="mx-auto max-w-lg text-sm text-muted-foreground">
							What would you like to build or analyze today? Select a prompt
							starter below or type your custom query.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
						{PROMPT_STARTERS.map((starter: PromptStarter, idx: number) => (
							<button
								key={idx}
								type="button"
								onClick={() => handleSendMessage(starter.prompt)}
								className="group flex flex-col justify-between space-y-2 rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:border-indigo-500/40 hover:bg-muted dark:bg-zinc-900/60 dark:hover:bg-zinc-800"
							>
								<div className="flex items-center justify-between">
									<div className="rounded-xl bg-muted p-2 text-indigo-400 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-zinc-800">
										<StarterIcon type={starter.type} />
									</div>
									<ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-400" />
								</div>
								<div>
									<h3 className="text-xs font-bold text-foreground transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
										{starter.title}
									</h3>
									<p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
										{starter.desc}
									</p>
								</div>
							</button>
						))}
					</div>
				</div>
			) : (
				<div className="mx-auto max-w-3xl space-y-8 pb-6">
					{messages.map((msg: Message, idx: number) => {
						const isMessageStreaming =
							isGenerating &&
							msg.role === 'assistant' &&
							idx === messages.length - 1;
						const isEditingThisMessage = editingMessageId === msg.id;

						return (
							<div
								key={msg.id}
								className="w-full"
							>
								{msg.role === 'user' ? (
									/* User Prompt: Uniformly rounded container aligned to the right, timestamp below */
									<div className="flex flex-col items-end space-y-1">
										<div
											className={`flex items-start gap-2 ${
												isEditingThisMessage
													? 'w-full'
													: 'max-w-full sm:max-w-[85%]'
											}`}
										>
											{!isEditingThisMessage && (
												<button
													type="button"
													disabled={
														isGenerating ||
														isSavingEdit ||
														editingMessageId !== null
													}
													onClick={() => onStartEdit(msg)}
													className="mt-2 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
													title="Edit prompt"
													aria-label="Edit prompt"
												>
													<Pencil className="h-4 w-4" />
												</button>
											)}
											<div
												className={`min-w-0 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 p-3 text-sm leading-relaxed text-white shadow-sm sm:text-base ${
													isEditingThisMessage ? 'w-full flex-1' : 'flex-1'
												}`}
											>
												{isEditingThisMessage ? (
													<div className="w-full space-y-2">
														<textarea
															value={editingContent}
															onChange={(event) =>
																onEditingContentChange(event.target.value)
															}
															rows={Math.min(
																10,
																Math.max(2, editingContent.split('\n').length),
															)}
															autoFocus
															className="block w-full resize-none border-0 bg-transparent p-0 font-sans text-sm leading-relaxed text-white shadow-none ring-0 outline-none focus:border-0 focus:ring-0 focus:outline-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none sm:text-base"
														/>
														<div className="flex justify-end gap-2 pt-1">
															<button
																type="button"
																disabled={isSavingEdit}
																onClick={onCancelEdit}
																className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
															>
																Cancel
															</button>
															<button
																type="button"
																disabled={
																	isSavingEdit || !editingContent.trim()
																}
																onClick={onSaveEdit}
																className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-white/90 disabled:opacity-50"
															>
																{isSavingEdit ? 'Saving...' : 'Save'}
															</button>
														</div>
													</div>
												) : (
													<div className="font-sans whitespace-pre-wrap">
														{msg.content}
													</div>
												)}
											</div>
										</div>
										<div className="pr-1 text-[11px] text-muted-foreground">
											{msg.timestamp}
										</div>
									</div>
								) : (
									/* AI Message: Rendered via Streamdown with code block controls */
									<div className="flex flex-col space-y-3 text-sm leading-relaxed text-foreground sm:text-base dark:text-zinc-200">
										<div className="min-w-0">
											<Streamdown
												plugins={{ code }}
												isAnimating={isMessageStreaming}
												controls={{
													code: { copy: true, download: true },
												}}
											>
												{msg.content}
											</Streamdown>
										</div>

										<div className="flex items-center justify-between border-border/80 pt-1 text-xs text-muted-foreground">
											<button
												type="button"
												onClick={() => void handleCopy(msg.content, msg.id)}
												className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs transition hover:bg-muted hover:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
												title="Copy AI Message"
											>
												{copiedId === msg.id ? (
													<>
														<Check className="h-3.5 w-3.5 text-foreground dark:text-zinc-300" />
														<span className="text-foreground dark:text-zinc-300">
															Copied
														</span>
													</>
												) : (
													<>
														<Copy className="h-3.5 w-3.5 text-muted-foreground" />
														<span>Copy</span>
													</>
												)}
											</button>

											<div className="flex items-center gap-3">
												<span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] text-indigo-400">
													{msg.model || selectedModel.id}
												</span>
												<span>{msg.timestamp}</span>
											</div>
										</div>
									</div>
								)}
							</div>
						);
					})}

					{isGenerating && (
						<div className="flex animate-pulse items-center gap-3 py-2 text-sm text-muted-foreground">
							<div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
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
