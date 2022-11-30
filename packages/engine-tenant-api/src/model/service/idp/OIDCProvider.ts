import * as Typesafe from '@contember/typesafe'
import { Client, custom, errors, generators, Issuer, ResponseType } from 'openid-client'
import { IDPResponseError } from './IDPResponseError'
import { IdentityProviderHandler, IDPClaim, InitIDPAuthResult } from './IdentityProviderHandler'
import { IDPValidationError } from './IDPValidationError'
import { InvalidIDPConfigurationError } from './InvalidIDPConfigurationError'

custom.setHttpOptionsDefaults({
	timeout: 5000,
})


export interface SessionData {
	nonce: string
	state: string
}

const OIDCConfiguration = Typesafe.intersection(
	Typesafe.object({
		url: Typesafe.string,
		clientId: Typesafe.string,
		clientSecret: Typesafe.string,
	}),
	Typesafe.partial({
		responseType: Typesafe.enumeration<ResponseType>('code', 'code id_token', 'code id_token token', 'code token', 'id_token', 'id_token token', 'none'),
		claims: Typesafe.string,
	}),
)

export type OIDCConfiguration = ReturnType<typeof OIDCConfiguration>

const OIDCResponseData = Typesafe.object({
	url: Typesafe.string,
	redirectUrl: Typesafe.string,
	sessionData: Typesafe.object({
		nonce: Typesafe.string,
		state: Typesafe.string,
	}),
})

export type OIDCResponseData = ReturnType<typeof OIDCResponseData>

export class OIDCProvider implements IdentityProviderHandler<SessionData, OIDCResponseData, OIDCConfiguration> {
	private issuerCache: Record<string, Issuer<Client>> = {}

	public async initAuth(
		configuration: OIDCConfiguration,
		redirectUrl: string,
	): Promise<InitIDPAuthResult<SessionData>> {
		const client = await this.createOIDCClient(configuration)
		const nonce = generators.nonce()
		const state = generators.state()
		const url = client.authorizationUrl({
			redirect_uri: redirectUrl,
			scope: configuration.claims ?? 'openid email',
			nonce,
			state,
		})
		return {
			authUrl: url,
			sessionData: { nonce, state },
		}
	}

	public async processResponse(
		configuration: OIDCConfiguration,
		{ url, sessionData, redirectUrl }: OIDCResponseData,
	): Promise<IDPClaim> {
		const client = await this.createOIDCClient(configuration)
		const params = client.callbackParams(url)
		try {
			const result = await client.callback(redirectUrl, params, sessionData)
			const claims = result.claims()
			return {
				externalIdentifier: claims.sub,
				email: claims.email,
				name: claims.name,
			}
		} catch (e: any) {
			if (e instanceof errors.RPError) {
				throw new IDPValidationError(e.message)
			}
			if (e instanceof errors.OPError) {
				const body = e.response?.body as any
				if (typeof body === 'object' && typeof body?.error === 'object' && typeof body.error?.message === 'string') {
					throw new IDPResponseError(body.error.message)
				}
				throw new IDPResponseError(e.message)
			}
			throw e
		}
	}

	public validateResponseData(config: unknown): OIDCResponseData {
		try {
			return OIDCResponseData(config)
		} catch (e) {
			if (e instanceof Typesafe.ParseError) {
				throw new IDPValidationError(e.message)
			}
			throw e
		}
	}

	public validateConfiguration(config: unknown): OIDCConfiguration {
		try {
			return OIDCConfiguration(config)
		} catch (e) {
			if (e instanceof Typesafe.ParseError) {
				throw new InvalidIDPConfigurationError(e.message)
			}
			throw e
		}
	}

	private async createOIDCClient(configuration: OIDCConfiguration): Promise<Client> {
		this.issuerCache[configuration.url] ??= await Issuer.discover(configuration.url)

		return new this.issuerCache[configuration.url].Client({
			client_id: configuration.clientId,
			client_secret: configuration.clientSecret,
			response_types: [configuration.responseType || 'code'],
		})
	}
}
