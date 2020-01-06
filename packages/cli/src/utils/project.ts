import { copy, pathExists } from 'fs-extra'
import { basename, join } from 'path'
import { resourcesDir } from '../pathUtils'
import { promises as fs } from 'fs'
import { listDirectories, replaceFileContent, tryUnlink } from './fs'
import { InstanceEnvironment, validateInstanceName } from './instance'
import { updateYaml } from './yaml'
import { projectNameToEnvName } from '@contember/engine-common'
import { hasInstanceAdmin } from './workspace'

export const validateProjectName = (name: string) => {
	if (!name.match(/^[a-z][-a-z0-9]*$/)) {
		throw new Error('Invalid project name. It can contain only alphanumeric letters, dash and must start with a letter')
	}
}
export const listProjects = async (args: { workspaceDirectory: string }) => {
	return (await listDirectories(join(args.workspaceDirectory, 'projects'))).map(it => basename(it))
}

export const createProject = async (args: { workspaceDirectory: string; projectName: string }) => {
	validateProjectName(args.projectName)
	const projectDir = join(args.workspaceDirectory, 'projects', args.projectName)
	const withAdmin = await hasInstanceAdmin(args)
	const template = withAdmin ? 'project-template' : 'project-no-admin-template'
	await copy(join(resourcesDir, 'templates', template), projectDir)
	await tryUnlink(join(projectDir, 'package.json'))
	await tryUnlink(join(projectDir, 'tsconfig.json'))
	await tryUnlink(join(projectDir, 'package-lock.json'))
	if (!withAdmin) {
		return
	}
	const filesToReplace = ['admin/index.ts']
	for (const file of filesToReplace) {
		const path = join(projectDir, file)
		await replaceFileContent(path, content => content.replace('{projectName}', args.projectName))
	}
}

export const registerProjectToInstance = async (
	args: {
		projectName: string
	} & InstanceEnvironment,
) => {
	validateInstanceName(args.instanceName)
	validateProjectName(args.projectName)
	const path = join(args.instanceDirectory, 'admin/src/projects.ts')
	if (await pathExists(path)) {
		const code = `export { default as ${args.projectName} } from '../../../../projects/${args.projectName}/admin'\n`
		await fs.appendFile(path, code, { encoding: 'utf8' })
	}

	await updateYaml(join(args.instanceDirectory, 'api/config.yaml'), (config, { merge }) =>
		merge(config, {
			projects: {
				[args.projectName]: {
					stages: { live: null },
				},
			},
		}),
	)
}

export const getProjectDockerEnv = (projectName: string): Record<string, string> => {
	validateProjectName(projectName)
	const projectEnvName = projectNameToEnvName(projectName)
	return {
		[`${projectEnvName}_DB_NAME`]: projectName,
		[`${projectEnvName}_S3_PREFIX`]: projectName,
	}
}
