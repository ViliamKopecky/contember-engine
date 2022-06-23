import { Response, ResponseError, ResponseOk } from '../../utils/Response.js'
import { AddIdpErrorCode, DisableIdpErrorCode, EnableIdpErrorCode, UpdateIdpErrorCode } from '../../../schema/index.js'
import { DatabaseContext } from '../../utils/index.js'
import { IdentityProvider } from '../../type/index.js'
import { IdentityProviderBySlugQuery } from '../../queries/index.js'
import { CreateIdpCommand } from '../../commands/idp/CreateIdpCommand.js'
import { IDPHandlerRegistry } from './IDPHandlerRegistry.js'
import { IdentityProviderNotFoundError } from './IdentityProviderNotFoundError.js'
import { InvalidIDPConfigurationError } from './InvalidIDPConfigurationError.js'
import { DisableIdpCommand } from '../../commands/idp/DisableIdpCommand.js'
import { EnableIdpCommand } from '../../commands/idp/EnableIdpCommand.js'
import { UpdateIdpCommand, UpdateIdpData } from '../../commands/idp/UpdateIdpCommand.js'

export class IDPManager {
	constructor(
		private readonly idpRegistry: IDPHandlerRegistry,
	) {
	}

	public async addIDP(db: DatabaseContext, idp: IdentityProvider): Promise<RegisterIDPResponse> {
		return await db.transaction(async db => {
			try {
				const providerService = this.idpRegistry.getHandler(idp.type)
				providerService.validateConfiguration(idp.configuration)
			} catch (e) {
				if (e instanceof IdentityProviderNotFoundError) {
					return new ResponseError(AddIdpErrorCode.UnknownType, `IDP type ${idp.type} not found`)
				}
				if (e instanceof InvalidIDPConfigurationError) {
					return new ResponseError(AddIdpErrorCode.InvalidConfiguration, `Invalid IDP configuration: ${e.message}`)
				}
				throw e
			}

			const existing = await db.queryHandler.fetch(new IdentityProviderBySlugQuery(idp.slug))
			if (existing) {
				return new ResponseError(AddIdpErrorCode.AlreadyExists, `IDP with slug ${idp.slug} already exists`)
			}
			await db.commandBus.execute(new CreateIdpCommand(idp))
			return new ResponseOk(null)
		})
	}

	public async disableIDP(db: DatabaseContext, slug: string): Promise<DisableIDPResponse> {
		return await db.transaction(async db => {
			const existing = await db.queryHandler.fetch(new IdentityProviderBySlugQuery(slug))
			if (!existing) {
				return new ResponseError(DisableIdpErrorCode.NotFound, `IDP ${slug} not found`)
			}
			if (!existing.disabledAt) {
				await db.commandBus.execute(new DisableIdpCommand(existing.id))
			}
			return new ResponseOk(null)
		})
	}


	public async enableIDP(db: DatabaseContext, slug: string): Promise<EnableIDPResponse> {
		return await db.transaction(async db => {
			const existing = await db.queryHandler.fetch(new IdentityProviderBySlugQuery(slug))
			if (!existing) {
				return new ResponseError(EnableIdpErrorCode.NotFound, `IDP ${slug} not found`)
			}
			if (existing.disabledAt) {
				await db.commandBus.execute(new EnableIdpCommand(existing.id))
			}
			return new ResponseOk(null)
		})
	}

	public async updateIDP(db: DatabaseContext, slug: string, data: UpdateIdpData): Promise<UpdateIDPResponse> {
		return await db.transaction(async db => {
			const existing = await db.queryHandler.fetch(new IdentityProviderBySlugQuery(slug))
			if (!existing) {
				return new ResponseError(UpdateIdpErrorCode.NotFound, `IDP ${slug} not found`)
			}
			try {
				const providerService = this.idpRegistry.getHandler(existing.type)
				providerService.validateConfiguration(data.configuration)
			} catch (e) {
				if (e instanceof InvalidIDPConfigurationError) {
					return new ResponseError(UpdateIdpErrorCode.InvalidConfiguration, `Invalid IDP configuration: ${e.message}`)
				}
				throw e
			}
			await db.commandBus.execute(new UpdateIdpCommand(existing.id, data))
			return new ResponseOk(null)
		})
	}
}

export type RegisterIDPResponse = Response<null, AddIdpErrorCode>
export type DisableIDPResponse = Response<null, DisableIdpErrorCode>
export type EnableIDPResponse = Response<null, EnableIdpErrorCode>
export type UpdateIDPResponse = Response<null, UpdateIdpErrorCode>
