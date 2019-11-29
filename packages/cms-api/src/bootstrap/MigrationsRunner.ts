import { DatabaseCredentials } from '@contember/engine-common'
import { Connection, wrapIdentifier } from '@contember/database'
import pgMigrate from 'node-pg-migrate'

export class MigrationsRunner {
	constructor(
		private readonly db: DatabaseCredentials,
		private readonly schema: string,
		private readonly dir: string,
	) {}

	public async migrate(log: boolean = true) {
		await this.createDatabaseIfNotExists()

		await pgMigrate({
			databaseUrl: this.db,
			dir: this.dir,
			schema: this.schema,
			migrationsTable: 'migrations',
			checkOrder: true,
			direction: 'up',
			count: Infinity,
			ignorePattern: '^\\..*$',
			createSchema: true,
			singleTransaction: true,
			log: (msg: string) => {
				log && console.log('    ' + msg.replace(/\n/g, '\n    '))
			},
		})
	}

	private async createDatabaseIfNotExists() {
		const connection = new Connection({ ...this.db, database: 'postgres' }, {})
		const result = await connection.query('SELECT 1 FROM "pg_database" WHERE "datname" = ?', [this.db.database])

		if (result.rowCount === 0) {
			console.warn(`Database ${this.db.database} does not exist, attempting to create it...`)
			await connection.query(`CREATE DATABASE ${wrapIdentifier(this.db.database)}`)
		}

		await connection.end()
	}
}
