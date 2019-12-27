import { Input, Model, Value } from '@contember/schema'
import Mapper from '../Mapper'
import UpdateBuilder from './UpdateBuilder'
import { UpdateInputProcessor } from '../../inputProcessing'
import * as Context from '../../inputProcessing/InputContext'
import {
	ConstraintType,
	getInsertPrimary,
	MutationConstraintViolationError,
	MutationEntryNotFoundError,
	MutationNothingToDo,
	MutationResultList,
	MutationResultType,
	NothingToDoReason,
	prependPath,
} from '../Result'

const hasManyProcessor = <Context extends { relation: Model.AnyRelation; index: number; alias?: string }>(
	innerProcessor: (context: Context) => Promise<MutationResultList>,
) => {
	return async (context: Context): Promise<MutationResultList> => {
		const { relation, index, alias } = context
		const path = [{ field: relation.name }, { index, alias }]
		return prependPath(path, await innerProcessor(context))
	}
}

const hasOneProcessor = <Context extends { relation: Model.AnyRelation }>(
	innerProcessor: (context: Context) => Promise<MutationResultList>,
) => {
	return async (context: Context): Promise<MutationResultList> => {
		const { relation } = context
		const path = [{ field: relation.name }]
		return prependPath(path, await innerProcessor(context))
	}
}

export default class SqlUpdateInputProcessor implements UpdateInputProcessor<MutationResultList> {
	constructor(
		private readonly primaryValue: Input.PrimaryValue,
		private readonly data: Input.UpdateDataInput,
		private readonly updateBuilder: UpdateBuilder,
		private readonly mapper: Mapper,
	) {}

	public column({ entity, column }: Context.ColumnContext) {
		if (this.data[column.name] !== undefined) {
			this.updateBuilder.addFieldValue(column.name, this.data[column.name] as Value.AtomicValue)
		}
		return Promise.resolve([])
	}

	manyHasManyInversed: UpdateInputProcessor<MutationResultList>['manyHasManyInversed'] = {
		connect: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			const primaryValue = await this.mapper.getPrimaryValue(targetEntity, input)
			if (!primaryValue) {
				return [new MutationEntryNotFoundError([], input)]
			}

			return await this.mapper.connectJunction(targetEntity, targetRelation, primaryValue, this.primaryValue)
		}),
		create: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			const insertResult = await this.mapper.insert(targetEntity, input)
			const primaryValue = getInsertPrimary(insertResult)
			if (!primaryValue) {
				return insertResult
			}
			return await this.mapper.connectJunction(targetEntity, targetRelation, primaryValue, this.primaryValue)
		}),
		update: hasManyProcessor(async ({ targetEntity, targetRelation, input: { where, data }, entity }) => {
			const primary = await this.mapper.getPrimaryValue(targetEntity, where)
			if (!primary) {
				return [new MutationEntryNotFoundError([], where)]
			}
			return [
				...(await this.mapper.update(targetEntity, { [targetEntity.primary]: primary }, data)),
				...(await this.mapper.connectJunction(targetEntity, targetRelation, primary, this.primaryValue)),
			]
		}),
		upsert: hasManyProcessor(async ({ targetEntity, targetRelation, input: { where, update, create }, entity }) => {
			const primary = await this.mapper.getPrimaryValue(targetEntity, where)
			if (primary) {
				const updateResult = await this.mapper.update(targetEntity, { [targetEntity.primary]: primary }, update)
				const connectResult = await this.mapper.connectJunction(
					targetEntity,
					targetRelation,
					primary,
					this.primaryValue,
				)
				return [...updateResult, ...connectResult]
			} else {
				const insertResult = await this.mapper.insert(targetEntity, create)
				const primaryValue = getInsertPrimary(insertResult)
				if (!primaryValue) {
					return insertResult
				}
				const connectResult = await this.mapper.connectJunction(
					targetEntity,
					targetRelation,
					primaryValue,
					this.primaryValue,
				)
				return [...insertResult, ...connectResult]
			}
		}),
		delete: hasManyProcessor(async ({ targetEntity, input }) => {
			return await this.mapper.delete(targetEntity, input)
		}),
		disconnect: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			const primaryValue = await this.mapper.getPrimaryValue(targetEntity, input)
			if (!primaryValue) {
				return [new MutationEntryNotFoundError([], input)]
			}

			return await this.mapper.disconnectJunction(targetEntity, targetRelation, primaryValue, this.primaryValue)
		}),
	}

	manyHasManyOwner: UpdateInputProcessor<MutationResultList>['manyHasManyOwner'] = {
		connect: hasManyProcessor(async ({ input, entity, relation, targetEntity }) => {
			const primaryValue = await this.mapper.getPrimaryValue(targetEntity, input)
			if (!primaryValue) {
				return [new MutationEntryNotFoundError([], input)]
			}
			return await this.mapper.connectJunction(entity, relation, this.primaryValue, primaryValue)
		}),
		create: hasManyProcessor(async ({ targetEntity, input, entity, relation }) => {
			const insertResult = await this.mapper.insert(targetEntity, input)
			const insertPrimary = getInsertPrimary(insertResult)
			if (!insertPrimary) {
				return insertResult
			}
			return [
				...insertResult,
				...(await this.mapper.connectJunction(entity, relation, this.primaryValue, insertPrimary)),
			]
		}),
		update: hasManyProcessor(async ({ targetEntity, input: { where, data }, entity, relation }) => {
			const primary = await this.mapper.getPrimaryValue(targetEntity, where)
			if (!primary) {
				return [new MutationEntryNotFoundError([], where)]
			}
			return [
				...(await this.mapper.update(targetEntity, { [targetEntity.primary]: primary }, data)),
				...(await this.mapper.connectJunction(entity, relation, this.primaryValue, primary)),
			]
		}),
		upsert: hasManyProcessor(async ({ targetEntity, input: { where, update, create }, entity, relation }) => {
			const primary = await this.mapper.getPrimaryValue(targetEntity, where)
			if (primary) {
				const updateResult = await this.mapper.update(targetEntity, { [targetEntity.primary]: primary }, update)
				const connectResult = await this.mapper.connectJunction(entity, relation, this.primaryValue, primary)
				return [...updateResult, ...connectResult]
			} else {
				const insertResult = await this.mapper.insert(targetEntity, create)

				const primaryValue = getInsertPrimary(insertResult)
				if (!primaryValue) {
					return insertResult
				}
				const connectResult = await this.mapper.connectJunction(entity, relation, this.primaryValue, primaryValue)
				return [...insertResult, ...connectResult]
			}
		}),
		delete: hasManyProcessor(async ({ targetEntity, input }) => {
			return await this.mapper.delete(targetEntity, input)
		}),
		disconnect: hasManyProcessor(async ({ input, entity, relation, targetEntity }) => {
			const primaryValue = await this.mapper.getPrimaryValue(targetEntity, input)
			if (!primaryValue) {
				return [new MutationEntryNotFoundError([], input)]
			}

			return await this.mapper.disconnectJunction(entity, relation, this.primaryValue, primaryValue)
		}),
	}

	manyHasOne: UpdateInputProcessor<MutationResultList>['manyHasOne'] = {
		connect: hasOneProcessor(async ({ targetEntity, input, relation }) => {
			const primary = await this.updateBuilder.addFieldValue(
				relation.name,
				this.mapper.getPrimaryValue(targetEntity, input),
			)
			if (primary === undefined) {
				return [new MutationEntryNotFoundError([], input)]
			}
			return []
		}),
		create: hasOneProcessor(async ({ targetEntity, input, relation }) => {
			// intentionally no await here
			const insert = this.mapper.insert(targetEntity, input)
			this.updateBuilder.addFieldValue(relation.name, async () => {
				const insertResult = await insert
				return getInsertPrimary(insertResult)
			})
			return await insert
		}),
		update: hasOneProcessor(async ({ targetEntity, input, entity, relation }) => {
			const inversedPrimary = await this.mapper.selectField(
				entity,
				{ [entity.primary]: this.primaryValue },
				relation.name,
			)
			if (!inversedPrimary) {
				return [new MutationNothingToDo([], NothingToDoReason.emptyRelation)]
			}
			return await this.mapper.update(targetEntity, { [targetEntity.primary]: inversedPrimary }, input)
		}),
		upsert: hasOneProcessor(async ({ targetEntity, input: { create, update }, entity, relation }) => {
			const select = this.mapper.selectField(entity, { [entity.primary]: this.primaryValue }, relation.name)

			const result: MutationResultList = []
			// addFieldValue has to be called immediately
			await this.updateBuilder.addFieldValue(relation.name, async () => {
				const primary = await select
				if (primary) {
					return undefined
				}
				const insertResult = await this.mapper.insert(targetEntity, create)
				const insertPrimary = getInsertPrimary(insertResult)
				if (insertPrimary) {
					return insertPrimary
				}
				result.push(...insertResult)
				return undefined
			})

			const inversedPrimary = await select
			if (inversedPrimary) {
				return await this.mapper.update(targetEntity, { [targetEntity.primary]: inversedPrimary }, update)
			} else {
				return result
			}
		}),
		delete: hasOneProcessor(async ({ targetEntity, entity, relation }) => {
			if (!relation.nullable) {
				return [new MutationConstraintViolationError([], ConstraintType.notNull)]
			}
			this.updateBuilder.addFieldValue(relation.name, null)
			const inversedPrimary = await this.mapper.selectField(
				entity,
				{ [entity.primary]: this.primaryValue },
				relation.name,
			)
			await this.updateBuilder.update
			return await this.mapper.delete(targetEntity, { [targetEntity.primary]: inversedPrimary })
		}),
		disconnect: hasOneProcessor(async ({ entity, relation }) => {
			if (!relation.nullable) {
				return [new MutationConstraintViolationError([], ConstraintType.notNull)]
			}
			this.updateBuilder.addFieldValue(relation.name, null)
			return []
		}),
	}

	oneHasMany: UpdateInputProcessor<MutationResultList>['oneHasMany'] = {
		connect: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.update(targetEntity, input, {
				[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
			})
		}),
		create: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.insert(targetEntity, {
				...input,
				[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
			})
		}),
		update: hasManyProcessor(async ({ targetEntity, targetRelation, input: { where, data }, entity }) => {
			return await this.mapper.update(
				targetEntity,
				{ ...where, [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				{
					...data,
					// [targetRelation.name]: {connect: thisPrimary}
				},
			)
		}),
		upsert: hasManyProcessor(async ({ targetEntity, targetRelation, input: { create, where, update }, entity }) => {
			const result = await this.mapper.update(
				targetEntity,
				{ ...where, [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				{
					...update,
					// [targetRelation.name]: {connect: thisPrimary}
				},
			)
			if (result[0].result === MutationResultType.notFoundError) {
				return await this.mapper.insert(targetEntity, {
					...create,
					[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
				})
			}
			return result
		}),
		delete: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.delete(targetEntity, {
				...input,
				[targetRelation.name]: { [entity.primary]: this.primaryValue },
			})
		}),
		disconnect: hasManyProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.update(
				targetEntity,
				{ ...input, [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				{ [targetRelation.name]: { disconnect: true } },
			)
		}),
	}

	oneHasOneInversed: UpdateInputProcessor<MutationResultList>['oneHasOneInversed'] = {
		connect: hasOneProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.update(targetEntity, input, {
				[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
			})
		}),
		create: hasOneProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return [
				...(await this.mapper.update(
					targetEntity,
					{ [targetRelation.name]: { [entity.primary]: this.primaryValue } },
					{ [targetRelation.name]: { disconnect: true } },
				)).filter(it => it.result !== MutationResultType.notFoundError),
				...(await this.mapper.insert(targetEntity, {
					...input,
					[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
				})),
			]
		}),
		update: hasOneProcessor(async ({ targetEntity, targetRelation, input, entity }) => {
			return await this.mapper.update(
				targetEntity,
				{ [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				input,
			)
		}),
		upsert: hasOneProcessor(async ({ targetEntity, targetRelation, input: { create, update }, entity }) => {
			const result = await this.mapper.update(
				targetEntity,
				{ [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				update,
			)
			if (result[0].result === MutationResultType.notFoundError) {
				return await this.mapper.insert(targetEntity, {
					...create,
					[targetRelation.name]: { connect: { [entity.primary]: this.primaryValue } },
				})
			}
			return result
		}),
		delete: hasOneProcessor(async ({ targetEntity, targetRelation, entity }) => {
			return await this.mapper.delete(targetEntity, { [targetRelation.name]: { [entity.primary]: this.primaryValue } })
		}),
		disconnect: hasOneProcessor(async ({ targetEntity, targetRelation, entity }) => {
			return await this.mapper.update(
				targetEntity,
				{ [targetRelation.name]: { [entity.primary]: this.primaryValue } },
				{ [targetRelation.name]: { disconnect: true } },
			)
		}),
	}

	oneHasOneOwner: UpdateInputProcessor<MutationResultList>['oneHasOneOwner'] = {
		connect: hasOneProcessor(async ({ targetEntity, input, entity, relation }) => {
			const result: MutationResultList = []

			await this.updateBuilder.addFieldValue(relation.name, async () => {
				const relationPrimary = (await this.mapper.getPrimaryValue(targetEntity, input)) as Input.PrimaryValue
				if (!relationPrimary) {
					result.push(new MutationEntryNotFoundError([], input))
					return undefined
				}

				const currentOwner = await this.mapper.getPrimaryValue(entity, {
					[relation.name]: { [targetEntity.primary]: relationPrimary },
				})
				if (currentOwner === this.primaryValue) {
					return undefined
				}
				if (currentOwner) {
					result.push(
						...(await this.mapper.update(
							entity,
							{
								[entity.primary]: currentOwner,
							},
							{ [relation.name]: { disconnect: true } },
						)),
					)
				}
				return relationPrimary
			})
			return result
		}),
		create: hasOneProcessor(async ({ targetEntity, input, relation }) => {
			const insert = this.mapper.insert(targetEntity, input)
			this.updateBuilder.addFieldValue(relation.name, async () => {
				const insertResult = await insert
				const insertPrimary = getInsertPrimary(insertResult)
				if (insertPrimary) {
					return insertPrimary
				}
				return undefined
			})
			return await insert
		}),
		update: hasOneProcessor(async ({ targetEntity, input, entity, relation }) => {
			const inversedPrimary = await this.mapper.selectField(
				entity,
				{ [entity.primary]: this.primaryValue },
				relation.name,
			)
			if (!inversedPrimary) {
				return [new MutationNothingToDo([], NothingToDoReason.emptyRelation)]
			}
			return await this.mapper.update(targetEntity, { [targetEntity.primary]: inversedPrimary }, input)
		}),
		upsert: hasOneProcessor(async ({ targetEntity, input: { create, update }, entity, relation }) => {
			const select = this.mapper.selectField(entity, { [entity.primary]: this.primaryValue }, relation.name)

			const result: MutationResultList = []
			//addColumnData has to be called synchronously
			await this.updateBuilder.addFieldValue(relation.name, async () => {
				const primary = await select
				if (primary) {
					return undefined
				}
				const insertResult = await this.mapper.insert(targetEntity, create)
				const insertPrimary = getInsertPrimary(insertResult)
				if (insertPrimary) {
					return insertPrimary
				}
				result.push(...insertResult)
				return undefined
			})

			const inversedPrimary = await select
			if (inversedPrimary) {
				return await this.mapper.update(targetEntity, { [targetEntity.primary]: inversedPrimary }, update)
			}
			return result
		}),
		delete: hasOneProcessor(async ({ targetEntity, entity, relation }) => {
			if (!relation.nullable) {
				return [new MutationConstraintViolationError([], ConstraintType.notNull)]
			}
			this.updateBuilder.addFieldValue(relation.name, null)
			const inversedPrimary = await this.mapper.selectField(
				entity,
				{ [entity.primary]: this.primaryValue },
				relation.name,
			)
			await this.updateBuilder.update
			return await this.mapper.delete(targetEntity, { [targetEntity.primary]: inversedPrimary })
		}),
		disconnect: hasOneProcessor(async ({ entity, relation }) => {
			if (!relation.nullable) {
				return [new MutationConstraintViolationError([], ConstraintType.notNull)]
			}
			this.updateBuilder.addFieldValue(relation.name, null)
			return []
		}),
	}
}
