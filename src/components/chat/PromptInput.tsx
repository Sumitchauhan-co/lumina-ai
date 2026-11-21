'use client';

import { CheckCircle2, Paperclip, Send, Sliders, Square } from 'lucide-react';
import React from 'react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

export interface LLMModel {
	id: string;
	name: string;
	description: string;
	tier?: 'Free' | 'Pro';
	disabled?: boolean;
}

interface PromptProps {
	inputPrompt: string;
	setInputPrompt: (prompt: string) => void;
	handleSendMessage: () => void;
	handleStopGenerating?: () => void;
	isGenerating: boolean;
	selectedModel: LLMModel;
	models?: LLMModel[];
	onSelectModel?: (model: LLMModel) => void;
}

const DEFAULT_MODELS: LLMModel[] = [
	{
		id: 'openai/gpt-4o-mini',
		name: 'GPT-4o Mini',
		description: 'Great for everyday tasks, fast answers, and general queries.',
	},
	{
		id: 'openai/gpt-4o',
		name: 'GPT-4o',
		description:
			'High-reasoning omni-model for complex code, logic, and synthesis.',
	},
];

export default function Prompt({
	inputPrompt,
	setInputPrompt,
	handleSendMessage,
	handleStopGenerating,
	isGenerating,
	selectedModel,
	models = DEFAULT_MODELS,
	onSelectModel,
}: PromptProps) {
	const wordCount = inputPrompt.trim()
		? inputPrompt.trim().split(/\s+/u).filter(Boolean).length
		: 0;
	const exceedsWordLimit = wordCount > 1_000;
	const canSend =
		Boolean(inputPrompt.trim()) && !isGenerating && !exceedsWordLimit;

	return (
		<div className="shrink-0 border-t border-border/80 bg-background/90 p-3 backdrop-blur-xl md:p-4">
			<div className="mx-auto max-w-3xl">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (!isGenerating && canSend) {
							handleSendMessage();
						}
					}}
					className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-xl transition-all focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/40 dark:bg-zinc-900"
				>
					{/* Left attachment button */}
					<button
						type="button"
						disabled={isGenerating}
						className="mb-0.5 shrink-0 rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
						title="Attach Files / Images"
					>
						<Paperclip className="h-4 w-4" />
					</button>

					{/* Textarea Input */}
					<textarea
						value={inputPrompt}
						onChange={(e) => setInputPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (!isGenerating && canSend) {
									handleSendMessage();
								}
							}
						}}
						placeholder={`Ask ${selectedModel.name} anything...`}
						rows={1}
						className="max-h-32 w-full resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:text-base dark:text-zinc-100"
					/>

					{/* Right actions container */}
					<div className="mb-0.5 flex shrink-0 items-center gap-1.5">
						{/* shadcn Popover Component (Dismisses on outside click automatically) */}
						<Popover>
							<PopoverTrigger
								disabled={isGenerating}
								className="flex items-center justify-center rounded-xl p-2 text-muted-foreground transition outline-none hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
								title="Change AI Model"
							>
								<Sliders className="h-4 w-4" />
							</PopoverTrigger>

							<PopoverContent
								side="top"
								align="end"
								className="w-72 rounded-2xl border border-border bg-card p-2 text-foreground shadow-2xl backdrop-blur-xl dark:bg-zinc-900 dark:text-zinc-100"
							>
								<div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
									Select Model
								</div>
								<div className="mt-1 space-y-1">
									{models.map((model) => (
										<button
											type="button"
											key={model.id}
											disabled={model.disabled}
											onClick={() => {
												if (onSelectModel) {
													onSelectModel(model);
												}
											}}
											className={`flex w-full flex-col gap-1 rounded-xl p-2.5 text-left transition ${model.disabled ? 'cursor-not-allowed opacity-50' : ''} ${
												selectedModel.id === model.id
													? 'border border-indigo-500/30 bg-indigo-600/10'
													: 'border border-transparent hover:bg-muted dark:hover:bg-zinc-800/60'
											} `}
										>
											<div className="flex items-center justify-between">
												<span className="flex items-center gap-2 text-xs font-bold text-foreground dark:text-white">
													{model.name}
													{model.tier === 'Pro' && (
														<span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-500">
															{model.disabled ? 'PRO · UPGRADE' : 'PRO'}
														</span>
													)}
												</span>
												{selectedModel.id === model.id && (
													<CheckCircle2 className="h-4 w-4 text-indigo-400" />
												)}
											</div>
											<p className="text-[11px] leading-tight text-muted-foreground">
												{model.description}
											</p>
										</button>
									))}
								</div>
							</PopoverContent>
						</Popover>

						{/* Send / Stop Response Button */}
						{isGenerating ? (
							<button
								type="button"
								onClick={() => handleStopGenerating?.()}
								className="flex cursor-pointer items-center justify-center rounded-xl bg-rose-600 p-2 text-white shadow-md shadow-rose-600/30 transition-all hover:bg-rose-500 active:scale-95"
								title="Stop response"
								aria-label="Stop response"
							>
								<Square className="h-4 w-4 fill-current" />
							</button>
						) : (
							<button
								type="submit"
								disabled={!canSend}
								className={`flex items-center justify-center rounded-xl p-2 transition-all ${
									canSend
										? 'cursor-pointer bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-95'
										: 'cursor-not-allowed bg-muted text-muted-foreground dark:bg-zinc-800/50'
								} `}
								title="Send Message"
								aria-label="Send Message"
							>
								<Send className="h-4 w-4" />
							</button>
						)}
					</div>
				</form>

				<div className="mt-2 flex justify-between gap-4 text-[10px]">
					<p className="text-muted-foreground">
						Lumina is AI and can make mistakes. Check important info.
					</p>
					<p
						className={
							exceedsWordLimit ? 'text-destructive' : 'text-muted-foreground'
						}
					>
						{wordCount.toLocaleString()} / 1,000 words
					</p>
				</div>
			</div>
		</div>
	);
}
