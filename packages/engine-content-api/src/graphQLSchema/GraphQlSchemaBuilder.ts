import { GraphQLFieldConfigMap, GraphQLSchema } from 'graphql'
import { Model } from '@contember/schema'
import MutationProvider from './MutationProvider'
import QueryProvider from './QueryProvider'
import { ValidationQueriesProvider } from './ValidationQueriesProvider'
import { GraphQLObjectsFactory } from './GraphQLObjectsFactory'
import { Context } from '../types'
import { ResultSchemaTypeProvider } from './ResultSchemaTypeProvider'

export default class GraphQlSchemaBuilder {
	constructor(
		private readonly schema: Model.Schema,
		private readonly queryProvider: QueryProvider,
		private readonly validationQueriesProvider: ValidationQueriesProvider,
		private readonly mutationProvider: MutationProvider,
		private readonly graphqlObjectFactories: GraphQLObjectsFactory,
		private readonly resultSchemaTypeProvider: ResultSchemaTypeProvider,
	) {}

	public build(): GraphQLSchema {
		const mutations = {
			...Object.keys(this.schema.entities).reduce<GraphQLFieldConfigMap<any, any>>((mutations, entityName) => {
				return {
					...this.mutationProvider.getMutations(entityName),
					...mutations,
				}
			}, {}),
		}
		mutations.transaction = {
			type: this.graphqlObjectFactories.createNotNull(
				this.graphqlObjectFactories.createObjectType({
					name: 'MutationTransaction',
					fields: {
						ok: { type: this.graphqlObjectFactories.createNotNull(this.graphqlObjectFactories.boolean) },
						validation: {
							type: this.graphqlObjectFactories.createNotNull(this.resultSchemaTypeProvider.validationResultType),
						},
						...mutations,
					},
				}),
			),
			resolve: async (parent, args, context: Context, info) => {
				return await context.executionContainer.mutationResolver.resolveTransaction(info)
			},
		}

		const queries = Object.keys(this.schema.entities).reduce<GraphQLFieldConfigMap<any, any>>((queries, entityName) => {
			return {
				...this.queryProvider.getQueries(entityName),
				...this.validationQueriesProvider.getQueries(entityName),
				...queries,
			}
		}, {})
		queries.transaction = {
			type: this.graphqlObjectFactories.createObjectType({
				name: 'QueryTransaction',
				fields: { ...queries },
			}),
			resolve: async (parent, args, context: Context, info) => {
				return await context.executionContainer.readResolver.resolveTransaction(info)
			},
		}

		queries['_info'] = {
			type: this.graphqlObjectFactories.createObjectType({
				name: 'Info',
				fields: () => ({
					description: { type: this.graphqlObjectFactories.string },
				}),
			}),
			resolve: () => ({
				description: 'TODO',
			}),
		}

		return this.graphqlObjectFactories.createSchema({
			query: this.graphqlObjectFactories.createObjectType({
				name: 'Query',
				fields: () => queries,
			}),
			...(Object.keys(mutations).length > 0
				? {
						mutation: this.graphqlObjectFactories.createObjectType({
							name: 'Mutation',
							fields: () => mutations,
						}),
				  }
				: {}),
		})
	}
}
