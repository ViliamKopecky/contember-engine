import { filterObject, mapObject } from '../utils/object'
import { Model, Validation } from '@contember/schema'
import { acceptEveryFieldVisitor, acceptFieldVisitor } from '@contember/schema-utils'
import { InputValidation } from '@contember/schema-definition'
import DependencyCollector from './dependencies/DependencyCollector'
import { NotSupportedError } from './exceptions'

export class EntityRulesResolver {
	constructor(private readonly validationSchema: Validation.Schema, private readonly model: Model.Schema) {}

	public getSimpleRules(entityName: string) {
		return mapObject(this.getEntityRules(entityName), (rules, field) => {
			acceptFieldVisitor(this.model, entityName, field, {
				visitColumn: () => null,
				visitHasOne: () => null,
				visitHasMany: () => {
					throw new NotSupportedError('Rules on has-many relations are currently not supported.')
				},
			})
			for (const rule of rules) {
				const dependencies = DependencyCollector.collect(rule.validator)
				for (const dep of Object.keys(dependencies)) {
					const isRelation = acceptFieldVisitor(this.model, entityName, dep, {
						visitColumn: () => false,
						visitRelation: () => true,
					})
					if (isRelation) {
						throw new NotSupportedError('Rules dependent on relations are currently not supported.')
					}
				}
			}
			return rules
		})
	}

	public getEntityRules(entityName: string): Validation.EntityRules {
		const definedRules = this.validationSchema[entityName] || {}
		const fieldsNotNullFlag = acceptEveryFieldVisitor(this.model, entityName, new NotNullFieldsVisitor())
		const notNullFields = Object.keys(filterObject(fieldsNotNullFlag, (field, val) => val))
		return notNullFields.reduce(
			(entityRules, field) => ({
				...entityRules,
				[field]: [
					...(entityRules[field] || []),
					{ validator: InputValidation.rules.defined(), message: { text: 'Field is required' } },
				],
			}),
			definedRules,
		)
	}
}

class NotNullFieldsVisitor implements Model.RelationByTypeVisitor<boolean>, Model.ColumnVisitor<boolean> {
	visitColumn(entity: Model.Entity, column: Model.AnyColumn): boolean {
		return !column.nullable
	}

	visitManyHasManyInversed(): boolean {
		return false
	}

	visitManyHasManyOwner(): boolean {
		return false
	}

	visitManyHasOne(entity: Model.Entity, relation: Model.ManyHasOneRelation): boolean {
		return !relation.nullable
	}

	visitOneHasMany(): boolean {
		return false
	}

	visitOneHasOneInversed(entity: Model.Entity, relation: Model.OneHasOneInversedRelation): boolean {
		return !relation.nullable
	}

	visitOneHasOneOwner(entity: Model.Entity, relation: Model.OneHasOneOwnerRelation): boolean {
		return !relation.nullable
	}
}
