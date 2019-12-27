import { CreateInputProcessor } from '../../inputProcessing'
import * as Context from '../../inputProcessing/InputContext'
import { Input, Model } from '@contember/schema'
import { appendRelationToPath, ValidationPath } from '../ValidationPath'
import Mapper from '../../sql/Mapper'
import { InputPreValidator } from './InputPreValidator'

type Result = any
const NoResult = () => Promise.resolve([])

export class CreateInputPreValidationProcessor implements CreateInputProcessor<Result> {
	constructor(
		private readonly inputValidator: InputPreValidator,
		private readonly path: ValidationPath,
		private readonly mapper: Mapper,
	) {}

	manyHasManyInversed: CreateInputProcessor.HasManyRelationProcessor<Context.ManyHasManyInversedContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}

	manyHasManyOwner: CreateInputProcessor.HasManyRelationProcessor<Context.ManyHasManyOwnerContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}

	manyHasOne: CreateInputProcessor.HasOneRelationProcessor<Context.ManyHasOneContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}

	oneHasMany: CreateInputProcessor.HasManyRelationProcessor<Context.OneHasManyContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}
	oneHasOneInversed: CreateInputProcessor.HasOneRelationProcessor<Context.OneHasOneInversedContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}
	oneHasOneOwner: CreateInputProcessor.HasOneRelationProcessor<Context.OneHasOneOwnerContext, Result> = {
		connect: NoResult,
		create: context => this.validateCreate(context),
	}

	async validateCreate(context: {
		targetEntity: Model.Entity
		relation: Model.AnyRelation
		input: Input.CreateDataInput
		targetRelation: Model.AnyRelation | null
		index?: number
		alias?: string
	}) {
		const newPath = appendRelationToPath(this.path, context.relation.name, context)
		return this.inputValidator.validateCreate({
			mapper: this.mapper,
			entity: context.targetEntity,
			data: context.input,
			path: newPath,
			overRelation: context.targetRelation,
		})
	}

	async column(context: Context.ColumnContext): Promise<Result> {
		return []
	}
}
