import React from 'react';
import { Send, Paperclip, Sliders, CheckCircle2 } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';

export interface LLMModel {
	id: string;
	name: string;
	description: string;
}

interface PromptProps {
	inputPrompt: string;
	setInputPrompt: (prompt: string) => void;
	handleSendMessage: () => void;
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
	{
		id: 'anthropic/claude-3.5-sonnet',
		name: 'Claude 3.5 Sonnet',
		description: 'Unmatched nuance, complex coding, and structured analysis.',
	},
];

export default function Prompt({
	inputPrompt,
	setInputPrompt,
	handleSendMessage,
	isGenerating,
	selectedModel,
	models = DEFAULT_MODELS,
	onSelectModel,
}: PromptProps) {
	return (
		<div className="p-3 md:p-4 border-t border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl shrink-0">
			<div className="max-w-3xl mx-auto">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSendMessage();
					}}
					className="relative rounded-2xl bg-zinc-900 border border-zinc-800 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all p-2.5 shadow-xl flex items-end gap-2"
				>
					{/* Left attachment button */}
					<button
						type="button"
						className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition shrink-0 mb-0.5"
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
								handleSendMessage();
							}
						}}
						placeholder={`Ask ${selectedModel.name} anything...`}
						rows={1}
						className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 resize-none outline-none py-1.5 max-h-32"
					/>

					{/* Right actions container */}
					<div className="flex items-center gap-1.5 shrink-0 mb-0.5">
						{/* shadcn Popover Component (Dismisses on outside click automatically) */}
						<Popover>
							<PopoverTrigger
								className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition flex items-center justify-center outline-none"
								title="Change AI Model"
							>
								<Sliders className="h-4 w-4" />
							</PopoverTrigger>

							<PopoverContent
								side="top"
								align="end"
								className="w-72 bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 rounded-2xl shadow-2xl backdrop-blur-xl"
							>
								<div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
									Select Model
								</div>
								<div className="space-y-1 mt-1">
									{models.map((model) => (
										<button
											type="button"
											key={model.id}
											onClick={() => {
												if (onSelectModel) {
													onSelectModel(model);
												}
											}}
											className={`
                        w-full flex flex-col gap-1 p-2.5 rounded-xl transition text-left
                        ${
													selectedModel.id === model.id
														? 'bg-indigo-600/10 border border-indigo-500/30'
														: 'hover:bg-zinc-800/60 border border-transparent'
												}
                      `}
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold text-white">
													{model.name}
												</span>
												{selectedModel.id === model.id && (
													<CheckCircle2 className="h-4 w-4 text-indigo-400" />
												)}
											</div>
											<p className="text-[11px] text-zinc-400 leading-tight">
												{model.description}
											</p>
										</button>
									))}
								</div>
							</PopoverContent>
						</Popover>

						{/* Send Icon Button */}
						<button
							type="submit"
							disabled={!inputPrompt.trim() || isGenerating}
							className={`
                p-2 rounded-xl transition-all flex items-center justify-center
                ${
									inputPrompt.trim() && !isGenerating
										? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 active:scale-95'
										: 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
								}
              `}
							title="Send Message"
						>
							<Send className="h-4 w-4" />
						</button>
					</div>
				</form>

				<p className="text-[10px] text-center text-zinc-500 mt-2">
					Lumina is AI and can make mistakes. Check important info.
				</p>
			</div>
		</div>
	);
}
