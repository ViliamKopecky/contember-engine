import { UpdateInputProcessor } from '../../inputProcessing'
import * as Context from '../../inputProcessing/InputContext'
import { Input, Model } from '@contember/schema'
import { appendRelationToPath, ValidationPath } from '../ValidationPath'
import Mapper from '../../sql/Mapper'
import { InputPreValidator } from './InputPreValidator'

type Result = any

const NoResult = () => Promise.resolve([])

export class UpdateInputPreValidationProcessor implements UpdateInputProcessor<Result> {
	constructor(
		private readonly inputValidator: InputPreValidator,
		private readonly path: ValidationPath,
		private readonly mapper: Mapper,
	) {}

	async column(context: Context.ColumnContext): Promise<Result> {
		return []
	}

	manyHasManyInversed: UpdateInputProcessor.HasManyRelationInputProcessor<
		Context.ManyHasManyInversedContext,
		Result
	> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate({ ...ctx, input: ctx.input.data }),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}
	manyHasManyOwner: UpdateInputProcessor.HasManyRelationInputProcessor<Context.ManyHasManyOwnerContext, Result> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate({ ...ctx, input: ctx.input.data }),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}
	manyHasOne: UpdateInputProcessor.HasOneRelationInputProcessor<Context.ManyHasOneContext, Result> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate(ctx),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}
	oneHasMany: UpdateInputProcessor.HasManyRelationInputProcessor<Context.OneHasManyContext, Result> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate({ ...ctx, input: ctx.input.data }),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}
	oneHasOneInversed: UpdateInputProcessor.HasOneRelationInputProcessor<Context.OneHasOneInversedContext, Result> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate(ctx),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}

	oneHasOneOwner: UpdateInputProcessor.HasOneRelationInputProcessor<Context.OneHasOneOwnerContext, Result> = {
		create: ctx => this.processCreate(ctx),
		update: ctx => this.processUpdate(ctx),
		upsert: ctx => this.processUpsert(ctx),
		connect: NoResult,
		disconnect: NoResult,
		['delete']: NoResult,
	}

	async processCreate(context: {
		targetEntity: Model.Entity
		relation: Model.AnyRelation
		targetRelation: Model.AnyRelation | null
		input: Input.CreateDataInput
		index?: number
		alias?: string
	}) {
		const newPath = appendRelationToPath(this.path, context.relation.name, context)

		return this.inputValidator.validateCreate({
			entity: context.targetEntity,
			mapper: this.mapper,
			data: context.input,
			path: newPath,
			overRelation: context.targetRelation,
		})
	}

	async processUpsert(context: {
		targetEntity: Model.Entity
		targetRelation: Model.AnyRelation | null
		relation: Model.AnyRelation
		input: UpdateInputProcessor.UpsertInput
		index?: number
		alias?: string
	}) {
		const newPath = appendRelationToPath(this.path, context.relation.name, context)
		return [
			...(await this.inputValidator.validateUpdate({
				entity: context.targetEntity,
				mapper: this.mapper,
				data: context.input.update,
				path: newPath,
				where: {}, // todo
			})),
			...(await this.inputValidator.validateCreate({
				entity: context.targetEntity,
				mapper: this.mapper,
				data: context.input.create,
				path: newPath,
				overRelation: context.targetRelation,
			})),
		]
	}

	async processUpdate(context: {
		targetEntity: Model.Entity
		relation: Model.AnyRelation
		input: Input.UpdateDataInput
		targetRelation: Model.AnyRelation | null
		index?: number
		alias?: string
	}) {
		const newPath = appendRelationToPath(this.path, context.relation.name, context)
		return this.inputValidator.validateUpdate({
			entity: context.targetEntity,
			mapper: this.mapper,
			data: context.input,
			path: newPath,
			where: {}, // todo,
		})
	}
}
