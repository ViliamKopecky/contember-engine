#!/usr/bin/env node

import { CompositionRoot, readConfig, run } from '@contember/api'
import * as path from 'path'
import App from './projects/app/src/model'
;(async () => {
	const configFile = path.join(__dirname, '../../src/config/config.yaml')
	const projectsDirectory = path.join(__dirname, '../../node_modules')
	const projects = {
		app: App,
	}

	await run(false, await readConfig(configFile), projectsDirectory, projects)
})().catch(e => {
	console.log(e)
	process.exit(1)
})
