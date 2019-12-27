import { Input, Model } from '@contember/schema'
import ObjectNode from './ObjectNode'
import Mapper from '../sql/Mapper'
import { GraphQLObjectType, GraphQLResolveInfo } from 'graphql'
import GraphQlQueryAstFactory from './GraphQlQueryAstFactory'
import { ImplementationException } from '../exception'
import { Client, Connection } from '@contember/database'
import { Operation, readOperationMeta } from '../graphQLSchema/OperationExtension'
import { assertNever } from '../utils'

export default class ReadResolver {
	constructor(
		private readonly db: Client,
		private readonly mapperFactory: Mapper.Factory,
		private readonly queryAstFactory: GraphQlQueryAstFactory,
	) {}

	public async resolveTransaction(info: GraphQLResolveInfo) {
		const queryAst = this.queryAstFactory.create(info)
		const fields = (info.returnType as GraphQLObjectType).getFields()

		return this.db.transaction(async trx => {
			await trx.connection.query(Connection.REPEATABLE_READ)
			const mapper = this.mapperFactory(trx)
			const trxResult: Record<string, any> = {}

			// todo execute in parallel
			for (const field of queryAst.fields) {
				if (!(field instanceof ObjectNode)) {
					throw new ImplementationException()
				}
				const fieldConfig = fields[field.name]
				const meta = readOperationMeta(fieldConfig.extensions)
				trxResult[field.alias] = await (() => {
					switch (meta.operation) {
						case Operation.get:
							return mapper.selectUnique(meta.entity, field)
						case Operation.list:
							return mapper.select(meta.entity, field)
						case Operation.create:
						case Operation.update:
						case Operation.delete:
							throw new ImplementationException()
					}
					return assertNever(meta.operation)
				})()
			}
			return trxResult
		})
	}

	public async resolveListQuery(entity: Model.Entity, info: GraphQLResolveInfo) {
		const queryAst: ObjectNode<Input.ListQueryInput> = this.queryAstFactory.create(info)
		return await this.mapperFactory(this.db).select(entity, queryAst)
	}

	public async resolveGetQuery(entity: Model.Entity, info: GraphQLResolveInfo) {
		const queryAst: ObjectNode<Input.UniqueQueryInput> = this.queryAstFactory.create(info)
		return await this.mapperFactory(this.db).selectUnique(entity, queryAst)
	}
}
