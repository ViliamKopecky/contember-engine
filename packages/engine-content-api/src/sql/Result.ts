import { Input, Model, Value } from '@contember/schema'
import { convertError } from './ErrorUtils'
import { tuple } from '../utils'

export enum MutationResultType {
	ok = 'ok',
	nothingToDo = 'nothingToDo',
	notFoundError = 'notFoundError',
	constraintViolationError = 'constraintViolationError',
	noResultError = 'noResultError',
	validationError = 'validationError',
	inputError = 'inputError',
}

export enum ModificationType {
	create = 'create',
	update = 'update',
	delete = 'delete',
	junctionUpdate = 'junctionUpdate',
}

export type MutationResult =
	| MutationUpdateOk
	| MutationCreateOk
	| MutationDeleteOk
	| MutationJunctionUpdateOk
	| MutationEntryNotFoundError
	| MutationNothingToDo
	| MutationConstraintViolationError
	| MutationNoResultError
	| MutationInputError

export type MutationResultList = MutationResult[]

type Path = ({ field: string } | { index: number; alias?: string })[]

interface MutationResultInterface {
	result: MutationResultType
	path: Path
	message?: string
}

export type RowValues = { [fieldName: string]: Value.AtomicValue }
export class MutationUpdateOk implements MutationResultInterface {
	result = MutationResultType.ok as const
	type = ModificationType.update as const

	constructor(
		public readonly path: Path,
		public readonly entity: Model.Entity,
		public readonly primary: Value.PrimaryValue,
		public readonly input: Input.UpdateDataInput,
		public readonly values: RowValues,
	) {}
}

export class MutationCreateOk implements MutationResultInterface {
	result = MutationResultType.ok as const
	type = ModificationType.create as const

	constructor(
		public readonly path: Path,
		public readonly entity: Model.Entity,
		public readonly primary: Value.PrimaryValue,
		public readonly input: Input.CreateDataInput,
		public readonly values: RowValues,
	) {}
}

export class MutationDeleteOk implements MutationResultInterface {
	result = MutationResultType.ok as const
	type = ModificationType.delete as const

	constructor(
		public readonly path: Path,
		public readonly entity: Model.Entity,
		public readonly primary: Value.PrimaryValue,
	) {}
}

export class MutationJunctionUpdateOk implements MutationResultInterface {
	result = MutationResultType.ok as const
	type = ModificationType.junctionUpdate as const

	constructor(
		public readonly path: Path,
		public readonly entity: Model.Entity,
		public readonly relation: Model.ManyHasManyOwnerRelation,
		public readonly ownerUnique: Input.PrimaryValue,
		public readonly inversedUnique: Input.PrimaryValue,
	) {}
}

export enum NothingToDoReason {
	noData = 'noData',
	emptyRelation = 'emptyRelation',
	alreadyExists = 'alreadyExists',
}

export class MutationNothingToDo implements MutationResultInterface {
	result = MutationResultType.nothingToDo as const

	constructor(public readonly path: Path, public readonly reason: NothingToDoReason) {}
}

export enum InputErrorKind {
	nonUniqueWhere = 'nonUniqueWhere',
}

export class MutationInputError implements MutationResultInterface {
	result = MutationResultType.inputError as const

	constructor(public readonly path: Path, public readonly kind: InputErrorKind, public readonly message?: string) {}
}

export enum ConstraintType {
	notNull = 'notNull',
	uniqueKey = 'uniqueKey',
	foreignKey = 'foreignKey',
}

export class MutationConstraintViolationError implements MutationResultInterface {
	result = MutationResultType.constraintViolationError as const

	constructor(public readonly path: Path, public readonly constraint: ConstraintType) {}
}

// maybe denied by acl
export class MutationEntryNotFoundError implements MutationResultInterface {
	result = MutationResultType.notFoundError as const

	constructor(public readonly path: Path, public readonly where: Input.UniqueWhere) {}
}

// possibly denied by acl
export class MutationNoResultError implements MutationResultInterface {
	result = MutationResultType.noResultError as const

	constructor(public readonly path: Path) {}
}

export const prependPath = (path: Path, results: MutationResultList): MutationResultList =>
	results.map(it => ({ ...it, path: [...path, ...it.path] }))

export const getInsertPrimary = (result: MutationResultList) =>
	result[0] && result[0].result === MutationResultType.ok && result[0].type === ModificationType.create
		? result[0].primary
		: undefined

export const getUpdatePrimary = (result: MutationResultList) =>
	result[0] && result[0].result === MutationResultType.ok && result[0].type === ModificationType.update
		? result[0].primary
		: undefined

export const flattenResult = (result: (MutationResultList | MutationResultList[])[]): MutationResultList =>
	result
		.reduce<(MutationResult | MutationResult[])[]>((acc, it) => [...acc, ...it], [])
		.reduce<MutationResultList>((acc, it) => (Array.isArray(it) ? [...acc, ...it] : [...acc, it]), [])

export type ResultListNotFlatten = MutationResultList | MutationResultList[]

export const collectResults = async (
	promises: (Promise<ResultListNotFlatten | undefined> | undefined)[],
): Promise<MutationResultList> => {
	const allPromises: Promise<ResultListNotFlatten>[] = promises.filter(
		(it): it is Promise<ResultListNotFlatten> => !!it,
	)
	const catchPromise = async (promise: Promise<ResultListNotFlatten>) => {
		try {
			return tuple(null, await promise)
		} catch (e) {
			const converted = convertError(e)
			if (!converted) {
				return tuple(e, null)
			}
			return tuple(null, [converted])
		}
	}

	const enrichedPromises: Promise<[any, null] | [null, ResultListNotFlatten]>[] = allPromises.map(catchPromise)

	const results = await Promise.all(enrichedPromises)
	const errored = results.map(([err]) => err).filter(it => !!it)
	if (errored.length > 0) {
		errored.slice(1).map(e => console.error(e))
		throw errored[0]
	}

	return flattenResult(
		results.map(([, it]) => it).filter((it): it is MutationResultList | MutationResultList[] => !!it),
	)
}
