#!/usr/bin/env node

import { readConfig, run } from './index'
import { Server } from 'net'
;(async () => {
	const configFile = process.env['CONTEMBER_CONFIG_FILE']
	if (!configFile) {
		throw new Error('env variable CONTEMBER_CONFIG_FILE is not set')
	}
	const projectsDir = process.env['CONTEMBER_PROJECTS_DIRECTORY']
	if (!projectsDir) {
		throw new Error('env variable CONTEMBER_PROJECTS_DIRECTORY is not set')
	}
	const signals = [
		['SIGHUP', 1],
		['SIGINT', 2],
		['SIGTERM', 15],
	] as const

	let server: Server
	for (const [signal, code] of signals) {
		process.on(signal, () => {
			console.log(`process received a ${signal} signal`)
			if (!server) {
				process.exit(128 + code)
			} else {
				server.close(() => {
					console.log(`server stopped by ${signal} with value ${code}`)
					process.exit(128 + code)
				})
			}
		})
	}
	const debug = process.env.NODE_ENV === 'development'
	const config = await readConfig(configFile)

	if (process.argv[2] === 'validate') {
		process.exit(0)
	}
	server = await run(debug, config, projectsDir)
})().catch(e => {
	console.log(e)
	process.exit(1)
})
