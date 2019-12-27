import { Command } from './Command'
import { UpdateBuilder } from '@contember/database'

class DisableApiKeyCommand implements Command<boolean> {
	constructor(private readonly apiKeyId: string) {}

	async execute({ db }: Command.Args): Promise<boolean> {
		const qb = UpdateBuilder.create()
			.table('api_key')
			.where({
				id: this.apiKeyId,
			})
			.values({ disabled_at: new Date() })

		return (await qb.execute(db)) > 0
	}
}

export { DisableApiKeyCommand }
