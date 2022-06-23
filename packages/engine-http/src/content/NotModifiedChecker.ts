import { DatabaseContext, LatestTransactionIdByStageQuery } from '@contember/engine-system-api'
import { Timer } from '../common/index.js'
import { Request, Response } from 'koa'


const NotModifiedHeaderName = 'x-contember-ref'

export interface NotModifiedCheckResult {
	isModified: boolean
	setResponseHeader: (response: Response) => void
}

export class NotModifiedChecker {
	public async checkNotModified({ request, timer, systemDatabase, stageSlug }: {
		request: Request
		timer: Timer
		systemDatabase: DatabaseContext
		stageSlug: string
	}): Promise<NotModifiedCheckResult | null> {
		if (request.headers[NotModifiedHeaderName] === undefined) {
			return null
		}
		const requestRef = request.get(NotModifiedHeaderName)
		const body = request.body
		const isMutation = typeof body === 'object' && 'query' in body && String(body.query).includes('mutation')
		if (isMutation) {
			return null
		}
		const latestRef = await timer('NotModifiedCheck', () => {
			const queryHandler = systemDatabase.queryHandler
			return queryHandler.fetch(new LatestTransactionIdByStageQuery(stageSlug))
		})

		return {
			isModified: latestRef !== requestRef,
			setResponseHeader: res => {
				if (res.status === 200) {
					res.set(NotModifiedHeaderName, latestRef)
				}
			},
		}
	}
}
