import { Config } from 'apollo-server-core'
import { GraphQLResolveInfo } from 'graphql'

import {
	MutationAddProjectMemberArgs,
	MutationCreateApiKeyArgs,
	MutationSetupArgs,
	MutationSignInArgs,
	MutationSignUpArgs,
	MutationUpdateProjectMemberVariablesArgs,
} from '../schema/types'
import ResolverContext from './ResolverContext'

import MeQueryResolver from './query/MeQueryResolver'

import SignUpMutationResolver from './mutation/person/SignUpMutationResolver'
import SignInMutationResolver from './mutation/person/SignInMutationResolver'
import AddProjectMemberMutationResolver from './mutation/projectMember/AddProjectMemberMutationResolver'
import UpdateProjectMemberVariablesMutationResolver from './mutation/projectMember/UpdateProjectMemberVariablesMutationResolver'
import SetupMutationResolver from './mutation/setup/SetupMutationResolver'
import CreateApiKeyMutationResolver from './mutation/apiKey/CreateApiKeyMutationResolver'

class ResolverFactory {
	public constructor(
		private meQueryResolver: MeQueryResolver,
		private signUpMutationResolver: SignUpMutationResolver,
		private signInMutationResolver: SignInMutationResolver,
		private addProjectMemberMutationResolver: AddProjectMemberMutationResolver,
		private setupMutationResolver: SetupMutationResolver,
		private updateProjectMemberVariablesMutationResolver: UpdateProjectMemberVariablesMutationResolver,
		private createApiKeyMutationResolver: CreateApiKeyMutationResolver
	) {}

	create(): Config['resolvers'] {
		return {
			Query: {
				me: this.meQueryResolver.me.bind(this.meQueryResolver),
			},
			Mutation: {
				signUp: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.signUpMutationResolver.signUp.call(
						this.signUpMutationResolver,
						parent,
						args as MutationSignUpArgs,
						context,
						info
					),
				signIn: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.signInMutationResolver.signIn.call(
						this.signInMutationResolver,
						parent,
						args as MutationSignInArgs,
						context,
						info
					),
				addProjectMember: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.addProjectMemberMutationResolver.addProjectMember.call(
						this.addProjectMemberMutationResolver,
						parent,
						args as MutationAddProjectMemberArgs,
						context,
						info
					),
				setup: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.setupMutationResolver.setup.call(
						this.setupMutationResolver,
						parent,
						args as MutationSetupArgs,
						context,
						info
					),
				updateProjectMemberVariables: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.updateProjectMemberVariablesMutationResolver.updateProjectMemberVariables.call(
						this.updateProjectMemberVariablesMutationResolver,
						parent,
						args as MutationUpdateProjectMemberVariablesArgs,
						context,
						info
					),
				createApiKey: (
					parent: any,
					args: ResolverFactory.FieldResolverArgs,
					context: ResolverContext,
					info: GraphQLResolveInfo
				) =>
					this.createApiKeyMutationResolver.createApiKey.call(
						this.createApiKeyMutationResolver,
						parent,
						args as MutationCreateApiKeyArgs,
						context,
						info
					),
			},
		}
	}
}

namespace ResolverFactory {
	export type FieldResolverArgs = {
		[argument: string]: any
	}
}

export default ResolverFactory
