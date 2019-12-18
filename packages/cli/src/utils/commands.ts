import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { Readable, Writable } from 'stream'

export type RunningCommand = { child: ChildProcessWithoutNullStreams; output: Promise<string> }
export const runCommand = (
	command: string,
	args: string[],
	options: {
		cwd: string
		stdin?: Readable
		stdout?: Writable
		stderr?: Writable
		env?: NodeJS.ProcessEnv
		detached?: boolean
	},
): RunningCommand => {
	const child = spawn(command, args, {
		cwd: options.cwd,
		env: { ...process.env, ...(options.env || {}) },
		detached: options.detached,
	})
	if (options.stdin) {
		options.stdin.pipe(child.stdin)
	}

	let stdout = ''
	let stderr = ''

	child.stdout.on('data', (chunk): void => {
		stdout += chunk.toString()
	})

	child.stderr.on('data', (chunk): void => {
		stderr += chunk.toString()
	})
	if (options.stdout) {
		child.stdout.pipe(options.stdout)
	}
	if (options.stderr) {
		child.stderr.pipe(options.stderr)
	}

	const output = new Promise<string>((resolve, reject) => {
		child.on('exit', (exitCode): void => {
			if (exitCode === 0) {
				resolve(stdout)
			} else {
				reject(new ChildProcessError(exitCode, stderr))
			}
		})
	})

	return { output, child }
}

export class ChildProcessError extends Error {
	constructor(public readonly exitCode: number | null, public readonly stderr: string) {
		super(`Command has failed(${exitCode}): ${stderr} `)
	}
}
