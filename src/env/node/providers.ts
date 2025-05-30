import type { Container } from '../../container';
import type { GitCommandOptions } from '../../git/commandOptions';
import type { GitProvider } from '../../git/gitProvider';
import type { RepositoryLocationProvider } from '../../git/location/repositorylocationProvider';
import type { SharedGkStorageLocationProvider } from '../../plus/repos/sharedGkStorageLocationProvider';
import type { GkWorkspacesSharedStorageProvider } from '../../plus/workspaces/workspacesSharedStorageProvider';
import { configuration } from '../../system/-webview/configuration';
// import { GitHubGitProvider } from '../../plus/github/githubGitProvider';
import type { GitResult } from './git/git';
import { Git } from './git/git';
import { LocalGitProvider } from './git/localGitProvider';
import { VslsGit, VslsGitProvider } from './git/vslsGitProvider';
import { GkCliIntegrationProvider } from './gk/cli/integration';
import { LocalRepositoryLocationProvider } from './gk/localRepositoryLocationProvider';
import { LocalSharedGkStorageLocationProvider } from './gk/localSharedGkStorageLocationProvider';
import { LocalGkWorkspacesSharedStorageProvider } from './gk/localWorkspacesSharedStorageProvider';

let gitInstance: Git | undefined;
function ensureGit(container: Container) {
	gitInstance ??= new Git(container);
	return gitInstance;
}

export function git(
	container: Container,
	options: GitCommandOptions,
	...args: any[]
): Promise<GitResult<string | Buffer>> {
	return ensureGit(container).exec(options, ...args);
}

export async function getSupportedGitProviders(container: Container): Promise<GitProvider[]> {
	const git = ensureGit(container);

	const providers: GitProvider[] = [
		new LocalGitProvider(container, git),
		new VslsGitProvider(container, new VslsGit(container, git)),
	];

	if (configuration.get('virtualRepositories.enabled')) {
		providers.push(
			new (
				await import(
					/* webpackChunkName: "integrations" */ '../../plus/integrations/providers/github/githubGitProvider'
				)
			).GitHubGitProvider(container),
		);
	}

	return providers;
}

export function getSharedGKStorageLocationProvider(container: Container): SharedGkStorageLocationProvider {
	return new LocalSharedGkStorageLocationProvider(container);
}

export function getSupportedRepositoryLocationProvider(
	container: Container,
	sharedStorage: SharedGkStorageLocationProvider,
): RepositoryLocationProvider {
	return new LocalRepositoryLocationProvider(container, sharedStorage);
}

export function getSupportedWorkspacesStorageProvider(
	container: Container,
	sharedStorage: SharedGkStorageLocationProvider,
): GkWorkspacesSharedStorageProvider {
	return new LocalGkWorkspacesSharedStorageProvider(container, sharedStorage);
}

export function getGkCliIntegrationProvider(container: Container): GkCliIntegrationProvider {
	return new GkCliIntegrationProvider(container);
}
