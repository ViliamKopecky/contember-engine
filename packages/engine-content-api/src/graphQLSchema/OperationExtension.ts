import { Model } from '@contember/schema'
import { ImplementationException } from '../exception'

export class OperationMeta {
	constructor(public readonly operation: Operation, public readonly entity: Model.Entity) {}
}

export const ExtensionKey = 'OperationMeta'

export const readOperationMeta = (data: Record<string, unknown> | undefined | null): OperationMeta => {
	if (!data) {
		throw new ImplementationException()
	}
	const meta = data[ExtensionKey]
	if (!(meta instanceof OperationMeta)) {
		throw new ImplementationException()
	}
	return meta
}

export const enum Operation {
	create = 'create',
	update = 'update',
	delete = 'delete',
	list = 'list',
	get = 'get',
}
