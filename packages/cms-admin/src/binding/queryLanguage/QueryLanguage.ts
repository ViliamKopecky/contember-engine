import { Environment } from '../dao'
import { VariableInputTransformer } from '../model'
import {
	DesugaredHasManyRelation,
	DesugaredHasOneRelation,
	EntityListParameters,
	EntityName,
	FieldName,
	Filter,
	HasManyRelation,
	HasOneRelation,
	QualifiedEntityList,
	QualifiedFieldList,
	QualifiedSingleEntity,
	RelativeEntityList,
	RelativeSingleEntity,
	RelativeSingleField,
	SugarableEntityListParameters,
	SugarableHasManyRelation,
	SugarableHasOneRelation,
	SugaredFilter,
	SugaredQualifiedEntityList,
	SugaredQualifiedFieldList,
	SugaredQualifiedSingleEntity,
	SugaredRelativeEntityList,
	SugaredRelativeSingleEntity,
	SugaredRelativeSingleField,
	SugaredUnconstrainedQualifiedEntityList,
	UnconstrainedQualifiedEntityList,
	UniqueWhere,
	UnsugarableEntityListParameters,
	UnsugarableHasManyRelation,
	UnsugarableHasOneRelation,
} from '../treeParameters'
import { Parser } from './Parser'

export namespace QueryLanguage {
	const preparePrimitiveEntryPoint = <Entry extends Parser.EntryPoint>(entryPoint: Entry) => (
		input: string | Parser.ParserResult[Entry],
		environment: Environment,
	): Parser.ParserResult[Entry] => {
		if (typeof input === 'string') {
			return Parser.parseQueryLanguageExpression(input, entryPoint, environment)
		}
		return input
	}

	const desugarSugarableUnconstrainedQualifiedEntityList = preparePrimitiveEntryPoint(
		Parser.EntryPoint.UnconstrainedQualifiedEntityList,
	)
	const desugarSugarableQualifiedEntityList = preparePrimitiveEntryPoint(Parser.EntryPoint.QualifiedEntityList)
	const desugarSugarableQualifiedFieldList = preparePrimitiveEntryPoint(Parser.EntryPoint.QualifiedFieldList)
	const desugarSugarableQualifiedSingleEntity = preparePrimitiveEntryPoint(Parser.EntryPoint.QualifiedSingleEntity)
	const desugarSugarableRelativeEntityList = preparePrimitiveEntryPoint(Parser.EntryPoint.RelativeEntityList)
	const desugarSugarableRelativeSingleEntity = preparePrimitiveEntryPoint(Parser.EntryPoint.RelativeSingleEntity)
	const desugarSugarableRelativeSingleField = preparePrimitiveEntryPoint(Parser.EntryPoint.RelativeSingleField)

	const desugarEntityListParameters = (
		sugarablePart: SugarableEntityListParameters,
		unsugarablePart: UnsugarableEntityListParameters,
		environment: Environment,
	): EntityListParameters => ({
		filter: sugarablePart.filter ? desugarFilter(sugarablePart.filter, environment) : undefined,
		limit: unsugarablePart.limit,
		offset: unsugarablePart.offset,
		orderBy: unsugarablePart.orderBy ? desugarOrderBy(unsugarablePart.orderBy, environment) : undefined,
	})

	const desugarHasOneRelation = (
		sugarable: SugarableHasOneRelation,
		unsugarable: UnsugarableHasOneRelation,
		environment: Environment,
	): HasOneRelation => ({
		field: sugarable.field,
		filter: sugarable.filter ? desugarFilter(sugarable.filter, environment) : undefined,
		reducedBy: sugarable.reducedBy ? desugarUniqueWhere(sugarable.reducedBy, environment) : undefined,
		connectTo: unsugarable.connectTo ? desugarUniqueWhere(unsugarable.connectTo, environment) : undefined,
		isNonbearing: unsugarable.isNonbearing,
	})

	const augmentDesugaredHasOneRelationPath = (
		path: DesugaredHasOneRelation[],
		environment: Environment,
	): HasOneRelation[] => path.map(item => desugarHasOneRelation(item, {}, environment))

	const augmentDesugaredHasManyRelation = (
		relation: DesugaredHasManyRelation,
		unsugarable: UnsugarableHasManyRelation,
		environment: Environment,
	): HasManyRelation => ({
		field: relation.field,
		filter: relation.filter,
		isNonbearing: unsugarable.isNonbearing,
		connectTo: unsugarable.connectTo ? desugarUniqueWhere(unsugarable.connectTo, environment) : undefined,
		orderBy: unsugarable.orderBy ? desugarOrderBy(unsugarable.orderBy, environment) : undefined,
		offset: unsugarable.offset,
		limit: unsugarable.limit,
	})

	const desugarHasOneRelationPath = (
		input: SugarableHasOneRelation[] | SugarableHasOneRelation,
		lastRelation: UnsugarableHasOneRelation,
		environment: Environment,
	): HasOneRelation[] => {
		if (!Array.isArray(input)) {
			input = [input]
		}

		const relationPath: HasOneRelation[] = []

		const cappedLength = input.length - 1
		let i = 0
		for (; i < cappedLength; i++) {
			// Deliberately leaving out the last element
			const pathNode = input[i]

			relationPath.push(desugarHasOneRelation(pathNode, {}, environment))
		}
		if (i in input) {
			relationPath.push(desugarHasOneRelation(input[i], lastRelation, environment))
		}

		return relationPath
	}

	const desugarHasManyRelation = (
		sugarablePart: SugarableHasManyRelation,
		unsugarablePart: UnsugarableHasManyRelation,
		environment: Environment,
	): HasManyRelation => ({
		...desugarEntityListParameters(sugarablePart, unsugarablePart, environment),
		connectTo: unsugarablePart.connectTo ? desugarUniqueWhere(unsugarablePart.connectTo, environment) : undefined,
		field: sugarablePart.field,
		isNonbearing: unsugarablePart.isNonbearing,
	})

	export const desugarUniqueWhere = preparePrimitiveEntryPoint(Parser.EntryPoint.UniqueWhere)
	export const desugarFilter = preparePrimitiveEntryPoint(Parser.EntryPoint.Filter)
	export const desugarOrderBy = preparePrimitiveEntryPoint(Parser.EntryPoint.OrderBy)

	export const desugarUnconstrainedQualifiedEntityList = (
		{ entities, ...unsugarableEntityList }: SugaredUnconstrainedQualifiedEntityList,
		environment: Environment,
	): UnconstrainedQualifiedEntityList => {
		let hasOneRelationPath: HasOneRelation[]
		let entityName: EntityName

		if (typeof entities === 'string') {
			const desugared = desugarSugarableUnconstrainedQualifiedEntityList(entities, environment)
			entityName = desugared.entityName
			hasOneRelationPath = augmentDesugaredHasOneRelationPath(desugared.hasOneRelationPath, environment)
		} else {
			entityName = entities.entityName
			hasOneRelationPath = desugarHasOneRelationPath(entities.hasOneRelationPath, {}, environment)
		}

		return {
			connectTo: unsugarableEntityList.connectTo
				? desugarUniqueWhere(unsugarableEntityList.connectTo, environment)
				: undefined,
			entityName,
			hasOneRelationPath,
		}
	}

	export const desugarQualifiedEntityList = (
		{ entities, ...unsugarableEntityList }: SugaredQualifiedEntityList,
		environment: Environment,
	): QualifiedEntityList => {
		let entityName: EntityName
		let hasOneRelationPath: HasOneRelation[]

		let filter: SugaredFilter | undefined

		if (typeof entities === 'string') {
			const desugared = desugarSugarableQualifiedEntityList(entities, environment)

			entityName = desugared.entityName
			filter = desugared.filter
			hasOneRelationPath = augmentDesugaredHasOneRelationPath(desugared.hasOneRelationPath, environment)
		} else {
			entityName = entities.entityName
			filter = entities.filter
			hasOneRelationPath = desugarHasOneRelationPath(entities.hasOneRelationPath, {}, environment)
		}

		return {
			entityName,
			hasOneRelationPath,
			...desugarEntityListParameters(
				{
					filter,
				},
				unsugarableEntityList,
				environment,
			),
			connectTo: unsugarableEntityList.connectTo
				? desugarUniqueWhere(unsugarableEntityList.connectTo, environment)
				: undefined,
		}
	}

	export const desugarQualifiedFieldList = (
		{ fields, ...unsugarableEntityList }: SugaredQualifiedFieldList,
		environment: Environment,
	): QualifiedFieldList => {
		throw new Error('TODO')
	}

	export const desugarQualifiedSingleEntity = (
		{ entity, ...unsugarableSingleEntity }: SugaredQualifiedSingleEntity,
		environment: Environment,
	): QualifiedSingleEntity => {
		let entityName: EntityName
		let where: UniqueWhere
		let filter: Filter | undefined
		let hasOneRelationPath: HasOneRelation[]

		if (typeof entity === 'string') {
			const desugaredEntity = desugarSugarableQualifiedSingleEntity(entity, environment)

			entityName = desugaredEntity.entityName
			where = desugaredEntity.where
			filter = desugaredEntity.filter
			hasOneRelationPath = augmentDesugaredHasOneRelationPath(desugaredEntity.hasOneRelationPath, environment)
		} else {
			entityName = entity.entityName
			where = desugarUniqueWhere(entity.where, environment)
			filter = entity.filter ? desugarFilter(entity.filter, environment) : undefined
			hasOneRelationPath = desugarHasOneRelationPath(entity.hasOneRelationPath, {}, environment)
		}

		return {
			entityName,
			where,
			filter,
			hasOneRelationPath,
			connectTo: unsugarableSingleEntity.connectTo
				? desugarUniqueWhere(unsugarableSingleEntity.connectTo, environment)
				: undefined,
		}
	}

	export const desugarRelativeSingleEntity = (
		sugaredRelativeSingleEntity: string | SugaredRelativeSingleEntity,
		environment: Environment,
	): RelativeSingleEntity => {
		if (typeof sugaredRelativeSingleEntity === 'string') {
			return desugarRelativeSingleEntity(sugaredRelativeSingleEntity, environment)
		}

		const { field, ...unsugarableEntity } = sugaredRelativeSingleEntity
		const hasOneRelationPath =
			typeof field === 'string'
				? augmentDesugaredHasOneRelationPath(
						desugarSugarableRelativeSingleEntity(field, environment).hasOneRelationPath,
						environment,
				  )
				: desugarHasOneRelationPath(field, unsugarableEntity, environment)

		return {
			hasOneRelationPath,
		}
	}

	export const desugarRelativeSingleField = (
		sugaredRelativeSingleField: string | SugaredRelativeSingleField,
		environment: Environment,
	): RelativeSingleField => {
		if (typeof sugaredRelativeSingleField === 'string') {
			return desugarRelativeSingleField(
				{
					field: sugaredRelativeSingleField,
				},
				environment,
			)
		}

		const { field, ...unsugarableField } = sugaredRelativeSingleField

		let hasOneRelationPath: HasOneRelation[]
		let fieldName: FieldName
		if (typeof field === 'string') {
			const desugaredField = desugarSugarableRelativeSingleField(field, environment)
			hasOneRelationPath = augmentDesugaredHasOneRelationPath(desugaredField.hasOneRelationPath, environment)
			fieldName = desugaredField.field
		} else {
			hasOneRelationPath = desugarHasOneRelationPath(field.hasOneRelationPath, {}, environment)
			fieldName = field.field
		}

		return {
			hasOneRelationPath,
			field: fieldName,
			isNonbearing: unsugarableField.isNonbearing,
			defaultValue: unsugarableField.defaultValue
				? VariableInputTransformer.transformValue(unsugarableField.defaultValue, environment)
				: undefined,
		}
	}

	export const desugarRelativeEntityList = (
		sugaredRelativeEntityList: string | SugaredRelativeEntityList,
		environment: Environment,
	): RelativeEntityList => {
		if (typeof sugaredRelativeEntityList === 'string') {
			return desugarRelativeEntityList(sugaredRelativeEntityList, environment)
		}

		const { field, ...unsugarableEntityList } = sugaredRelativeEntityList
		let hasOneRelationPath: HasOneRelation[]
		let hasManyRelation: HasManyRelation
		if (typeof field === 'string') {
			const desugaredField = desugarSugarableRelativeEntityList(field, environment)
			hasOneRelationPath = augmentDesugaredHasOneRelationPath(desugaredField.hasOneRelationPath, environment)
			hasManyRelation = augmentDesugaredHasManyRelation(
				desugaredField.hasManyRelation,
				unsugarableEntityList,
				environment,
			)
		} else {
			hasOneRelationPath = desugarHasOneRelationPath(field.hasOneRelationPath || [], {}, environment)
			hasManyRelation = desugarHasManyRelation(field.hasManyRelation, unsugarableEntityList, environment)
		}

		return {
			hasManyRelation,
			hasOneRelationPath,
		}
	}
}
