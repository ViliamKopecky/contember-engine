import { Acl } from 'cms-common'
import KnexWrapper from '../core/knex/KnexWrapper'
import ReadResolver from './graphQlResolver/ReadResolver'
import MutationResolver from './graphQlResolver/MutationResolver'
import Container from '../core/di/Container'

export interface Context {
	db: KnexWrapper
	identityVariables: Acl.VariablesMap
	executionContainer: Container<{ readResolver: ReadResolver; mutationResolver: MutationResolver }>
}
