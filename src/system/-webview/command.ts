import type { Command, Disposable, Uri } from 'vscode';
import { commands } from 'vscode';
import type { Action, ActionContext } from '../../api/gitlens';
import type { GlCommandBase } from '../../commands/commandBase';
import type { CodeLensCommands } from '../../config';
import type {
	CoreCommands,
	CoreGitCommands,
	GlCommands,
	GlCommandsDeprecated,
	WebviewCommands,
	WebviewViewCommands,
} from '../../constants.commands';
import { actionCommandPrefix } from '../../constants.commands';
import { Container } from '../../container';
import { isWebviewContext } from '../webview';

export type CommandCallback = Parameters<typeof commands.registerCommand>[1];

type CommandConstructor = new (container: Container, ...args: any[]) => GlCommandBase;
const registrableCommands: CommandConstructor[] = [];

export function command(): ClassDecorator {
	return (target: any) => {
		registrableCommands.push(target);
	};
}

export function registerCommand(
	command: GlCommands | GlCommandsDeprecated,
	callback: CommandCallback,
	thisArg?: any,
): Disposable {
	return commands.registerCommand(
		command,
		function (this: any, ...args) {
			let context: any;
			if (command === 'gitlens.gitCommands') {
				const arg = args?.[0];
				if (arg?.command != null) {
					context = { mode: args[0].command };
					if (arg?.state?.subcommand != null) {
						context.submode = arg.state.subcommand;
					}
				}
			}

			Container.instance.telemetry.sendEvent('command', {
				command: command,
				'context.mode': context?.mode,
				'context.submode': context?.submode,
			});

			if (command.startsWith('gitlens.graph.')) {
				Container.instance.telemetry.sendEvent('graph/command', {
					command: command,
					'context.mode': context?.mode,
					'context.submode': context?.submode,
				});
			} else if (command.startsWith('gitlens.home.')) {
				Container.instance.telemetry.sendEvent('home/command', {
					command: command,
					'context.mode': context?.mode,
					'context.submode': context?.submode,
				});
			}

			void Container.instance.usage.track(`command:${command}:executed`).catch();
			callback.call(this, ...args);
		},
		thisArg,
	);
}

export function registerWebviewCommand(
	command: WebviewCommands | WebviewViewCommands,
	callback: CommandCallback,
	thisArg?: any,
): Disposable {
	return commands.registerCommand(
		command,
		function (this: any, ...args) {
			const webview = isWebviewContext(args[0]) ? args[0].webview : undefined;

			Container.instance.telemetry.sendEvent('command', {
				command: command,
				webview: webview ?? '<missing>',
			});

			if (
				webview === 'gitlens.graph' ||
				webview === 'gitlens.views.graph' ||
				command.startsWith('gitlens.graph.') ||
				command.endsWith(':graph')
			) {
				Container.instance.telemetry.sendEvent('graph/command', {
					command: command,
					webview: webview ?? '<missing>',
				});
			} else if (
				webview === 'gitlens.views.home' ||
				command.startsWith('gitlens.home.') ||
				command.endsWith(':home')
			) {
				Container.instance.telemetry.sendEvent('home/command', {
					command: command,
					webview: webview ?? '<missing>',
				});
			}

			void Container.instance.usage.track(`command:${command}:executed`).catch();
			callback.call(this, ...args);
		},
		thisArg,
	);
}

export function registerCommands(container: Container): Disposable[] {
	return registrableCommands.map(c => new c(container));
}

export function executeActionCommand<T extends ActionContext>(
	action: Action<T>,
	args: Omit<T, 'type'>,
	runnerId?: number,
): Thenable<unknown> {
	return commands.executeCommand(`${actionCommandPrefix}${action}`, { ...args, type: action }, runnerId);
}

export function createCommand<T extends unknown[]>(
	command: GlCommands | CodeLensCommands,
	title: string,
	...args: T
): Command {
	return { command: command, title: title, arguments: args };
}

export function createTerminalLinkCommand<T extends object>(
	command: GlCommands,
	args: T,
): { command: GlCommands; args: T } {
	return { command: command, args: args };
}

export function executeCommand<U = any>(command: GlCommands): Thenable<U>;
export function executeCommand<T = unknown, U = any>(command: GlCommands, arg: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: GlCommands, ...args: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: GlCommands, ...args: T): Thenable<U> {
	return commands.executeCommand<U>(command, ...args);
}

export function createCoreCommand<T extends unknown[]>(command: CoreCommands, title: string, ...args: T): Command {
	return { command: command, title: title, arguments: args };
}

export function executeCoreCommand<T = unknown, U = any>(command: CoreCommands, arg: T): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U> {
	if (
		command !== 'setContext' &&
		command !== 'vscode.executeDocumentSymbolProvider' &&
		command !== 'vscode.changes' &&
		command !== 'vscode.diff' &&
		command !== 'vscode.open'
	) {
		Container.instance.telemetry.sendEvent('command/core', { command: command });
	}
	return commands.executeCommand<U>(command, ...args);
}

export function createCoreGitCommand<T extends unknown[]>(
	command: CoreGitCommands,
	title: string,
	...args: T
): Command {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function executeCoreGitCommand<U = any>(command: CoreGitCommands): Thenable<U>;
export function executeCoreGitCommand<T = unknown, U = any>(command: CoreGitCommands, arg: T): Thenable<U>;
export function executeCoreGitCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreGitCommands,
	...args: T
): Thenable<U>;
export function executeCoreGitCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreGitCommands,
	...args: T
): Thenable<U> {
	Container.instance.telemetry.sendEvent('command/core', { command: command });
	return commands.executeCommand<U>(command, ...args);
}

export function executeEditorCommand<T>(command: GlCommands, uri: Uri | undefined, args: T): Thenable<unknown> {
	return commands.executeCommand(command, uri, args);
}
