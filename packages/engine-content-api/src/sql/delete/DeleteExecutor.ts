import { Acl, Input, Model } from '@contember/schema'
import { assertNever } from '../../utils'
import UniqueWhereExpander from '../../graphQlResolver/UniqueWhereExpander'
import { acceptEveryFieldVisitor } from '@contember/schema-utils'
import WhereBuilder from '../select/WhereBuilder'
import { Client, DeleteBuilder, SelectBuilder } from '@contember/database'
import Path from '../select/Path'
import PredicateFactory from '../../acl/PredicateFactory'
import Mapper from '../Mapper'
import UpdateBuilderFactory from '../update/UpdateBuilderFactory'
import { NoResultError } from '../NoResultError'

type EntityRelationTuple = [Model.Entity, Model.ManyHasOneRelation | Model.OneHasOneOwnerRelation]

class DeleteExecutor {
	constructor(
		private readonly schema: Model.Schema,
		private readonly uniqueWhereExpander: UniqueWhereExpander,
		private readonly predicateFactory: PredicateFactory,
		private readonly whereBuilder: WhereBuilder,
		private readonly updateBuilderFactory: UpdateBuilderFactory,
	) {}

	public async execute(db: Client, entity: Model.Entity, where: Input.UniqueWhere): Promise<void> {
		await db.query('SET CONSTRAINTS ALL DEFERRED')
		const uniqueWhere = this.uniqueWhereExpander.expand(entity, where)
		const result = await this.delete(db, entity, uniqueWhere)
		if (result.length === 0) {
			throw new NoResultError()
		}
		await this.executeCascade(db, entity, result)

		await db.query('SET CONSTRAINTS ALL IMMEDIATE')
	}

	private async executeCascade(db: Client, entity: Model.Entity, values: Input.PrimaryValue[]): Promise<void> {
		await Promise.all(
			this.findOwningRelations(entity).map(async ([owningEntity, relation]) => {
				const relationWhere: Input.Where = { [relation.name]: { [entity.primary]: { in: values } } }
				switch (relation.joiningColumn.onDelete) {
					case Model.OnDelete.restrict:
						break
					case Model.OnDelete.cascade:
						const result = await this.delete(db, owningEntity, relationWhere)
						if (result.length > 0) {
							await this.executeCascade(db, owningEntity, result)
						}
						break
					case Model.OnDelete.setNull:
						await this.setNull(db, owningEntity, relation, relationWhere)
						break
					default:
						assertNever(relation.joiningColumn.onDelete)
				}
			}),
		)
	}

	private async delete(db: Client, entity: Model.Entity, where: Input.Where): Promise<string[]> {
		const predicate = this.predicateFactory.create(entity, Acl.Operation.delete)
		const inQb = SelectBuilder.create()
			.from(entity.tableName, 'root_')
			.select(['root_', entity.primaryColumn])
		const inQbWithWhere = this.whereBuilder.build(inQb, entity, new Path([]), { and: [where, predicate] })

		const qb = DeleteBuilder.create()
			.from(entity.tableName)
			.where(condition => condition.in(entity.primaryColumn, inQbWithWhere))
			.returning(entity.primaryColumn)

		return (await qb.execute(db)) as string[]
	}

	private async setNull(
		db: Client,
		entity: Model.Entity,
		relation: Model.Relation & Model.JoiningColumnRelation,
		where: Input.Where,
	): Promise<void> {
		const updateBuilder = this.updateBuilderFactory.create(entity, where)
		const predicateWhere = this.predicateFactory.create(entity, Acl.Operation.update, [relation.name])
		updateBuilder.addOldWhere(predicateWhere)
		updateBuilder.addNewWhere(predicateWhere)
		updateBuilder.addFieldValue(relation.name, null)
		await updateBuilder.execute(db)
	}

	private findOwningRelations(entity: Model.Entity): EntityRelationTuple[] {
		return Object.values(this.schema.entities)
			.map(entity =>
				acceptEveryFieldVisitor<null | EntityRelationTuple>(this.schema, entity, {
					visitColumn: () => null,
					visitManyHasManyInversed: () => null,
					visitManyHasManyOwner: () => null,
					visitOneHasOneInversed: () => null,
					visitOneHasMany: () => null,
					visitOneHasOneOwner: ({}, relation): EntityRelationTuple => [entity, relation],
					visitManyHasOne: ({}, relation): EntityRelationTuple => [entity, relation],
				}),
			)
			.reduce<EntityRelationTuple[]>(
				(acc, value) => [
					...acc,
					...Object.values(value).filter<EntityRelationTuple>((it): it is EntityRelationTuple => it !== null),
				],
				[],
			)
			.filter(([{}, relation]) => relation.target === entity.name)
	}
}

export default DeleteExecutor
