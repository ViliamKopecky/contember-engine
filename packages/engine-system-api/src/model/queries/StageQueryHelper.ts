import { DatabaseQueryable } from '@contember/database'
import { StageWithId } from '../dtos/Stage'
import { isUuid } from '../../utils/uuid'
import StageByIdQuery from './StageByIdQuery'
import StageBySlugQuery from './StageBySlugQuery'

export const prepareStageQueryBuilder = (queryable: DatabaseQueryable) => {
	return queryable
		.createSelectBuilder<StageWithId>()
		.select('id')
		.select('name')
		.select('slug')
		.select('event_id')
		.from('stage')
}

export const createStageQuery = (slugOrId: string) => {
	return isUuid(slugOrId) ? new StageByIdQuery(slugOrId) : new StageBySlugQuery(slugOrId)
}