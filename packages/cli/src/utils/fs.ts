import { tuple } from './tuple'
import { promises as fs } from 'fs'
import { join } from 'path'

export const listDirectories = async (dir: string): Promise<string[]> => {
	const entries = (await fs.readdir(dir)).map(it => join(dir, it))
	const stats = await Promise.all(entries.map(async it => tuple(it, await fs.lstat(it))))
	return stats.filter(([, it]) => it.isDirectory()).map(([it]) => it)
}

export const replaceFileContent = async (path: string, replacer: (content: string) => string): Promise<void> => {
	const content = await fs.readFile(path, { encoding: 'utf8' })
	const newContent = replacer(content)
	await fs.writeFile(path, newContent, { encoding: 'utf8' })
}

export const tryUnlink = async (path: string): Promise<void> => {
	try {
		await fs.unlink(path)
	} catch (e) {
		if (e.code && e.code === 'ENOENT') {
			return
		}
		throw e
	}
}
