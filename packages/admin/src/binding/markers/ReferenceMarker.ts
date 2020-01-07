import { assertNever } from '../utils'
import { BindingError } from '../BindingError'
import { ExpectedEntityCount, FieldName, Filter, UniqueWhere } from '../treeParameters'
import { EntityFields } from './EntityFields'
import { PlaceholderGenerator } from './PlaceholderGenerator'

// TODO unify with EntityListTreeConstraints / SingleEntityTreeConstraints
class ReferenceMarker {
	public readonly fieldName: FieldName
	public readonly references: ReferenceMarker.References

	public static readonly defaultReferencePreferences: {
		readonly [index in ExpectedEntityCount]: ReferenceMarker.ReferencePreferences
	} = {
		[ExpectedEntityCount.UpToOne]: {
			initialEntityCount: 1,
		},
		[ExpectedEntityCount.PossiblyMany]: {
			initialEntityCount: 1,
		},
	}

	public constructor(
		fieldName: FieldName,
		expectedCount: ExpectedEntityCount,
		fields: EntityFields,
		filter?: Filter,
		reducedBy?: UniqueWhere,
		preferences?: Partial<ReferenceMarker.ReferencePreferences>,
	)
	public constructor(fieldName: FieldName, references: ReferenceMarker.References)
	public constructor(
		fieldName: FieldName,
		decider: ExpectedEntityCount | ReferenceMarker.References,
		fields?: EntityFields,
		filter?: Filter,
		reducedBy?: UniqueWhere,
		preferences?: Partial<ReferenceMarker.ReferencePreferences>,
	) {
		let references: ReferenceMarker.References

		if (typeof decider === 'object') {
			references = decider
		} else if (decider === ExpectedEntityCount.UpToOne || decider === ExpectedEntityCount.PossiblyMany) {
			const constraints: ReferenceMarker.ReferenceConstraints = {
				expectedCount: decider,
				filter,
				reducedBy,
			}
			const placeholderName = PlaceholderGenerator.getReferencePlaceholder(fieldName, constraints)
			const normalizedPreferences: ReferenceMarker.ReferencePreferences = {
				...ReferenceMarker.defaultReferencePreferences[decider],
				...preferences,
			}
			if (normalizedPreferences.initialEntityCount < 0 || !Number.isInteger(normalizedPreferences.initialEntityCount)) {
				throw new BindingError(`The preferred 'initialEntityCount' for a relation must be a non-negative integer!`)
			}
			if (decider === ExpectedEntityCount.UpToOne && normalizedPreferences.initialEntityCount > 1) {
				throw new BindingError(`A ToOne reference cannot prefer more than one entity!`)
			}

			references = {
				[placeholderName]: Object.assign(constraints, {
					placeholderName,
					fields: fields || {},
					preferences: normalizedPreferences,
				}),
			}
		} else {
			throw assertNever(decider)
		}

		for (const placeholderName in references) {
			const reference = references[placeholderName]
			if (reference.reducedBy) {
				const fields = Object.keys(reference.reducedBy)

				if (fields.length !== 1) {
					// TODO this will change in future
					throw new BindingError(`A hasMany relation can only be reduced to a hasOne by exactly one field.`)
				}
			}
		}

		this.fieldName = fieldName
		this.references = references
	}

	public get placeholderName(): string {
		return PlaceholderGenerator.generateReferenceMarkerPlaceholder(this)
	}
}

namespace ReferenceMarker {
	export interface ReferenceConstraints {
		expectedCount: ExpectedEntityCount
		filter?: Filter
		reducedBy?: UniqueWhere
	}

	export interface ReferencePreferences {
		readonly initialEntityCount: number
	}

	export interface Reference extends ReferenceConstraints {
		fields: EntityFields
		preferences: ReferencePreferences
		placeholderName: string
	}

	export interface References {
		[alias: string]: Reference
	}
}

export { ReferenceMarker }
