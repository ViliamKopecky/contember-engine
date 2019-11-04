import { assertNever } from '@contember/utils'
import * as React from 'react'
import {
	AccessorTreeRoot,
	DataBindingError,
	EntityAccessor,
	EntityListAccessor,
	EntityForRemovalAccessor,
	Field,
	FieldAccessor,
	FieldName,
	getNestedEntity,
	Parser,
	ToOne,
} from '../../../../binding'
import { ChoiceFieldData } from './ChoiceFieldData'

export type DynamicChoiceFieldImplementationProps = ChoiceFieldData.BaseProps &
	Omit<Field.RawMetadata, 'data'> & {
		subTreeRootAccessor: AccessorTreeRoot
		currentValueEntity: EntityAccessor | EntityForRemovalAccessor | EntityListAccessor
		options: FieldName
	}

export const DynamicChoiceFieldImplementation = React.memo((props: DynamicChoiceFieldImplementationProps) => {
	const parsedOptions = Parser.parseQueryLanguageExpression(
		props.options,
		props.optionFieldFactory ? Parser.EntryPoint.QualifiedEntityList : Parser.EntryPoint.QualifiedFieldList,
		props.environment,
	)
	const { toOneProps } = parsedOptions
	const { currentValueEntity, subTreeRootAccessor } = props

	const subTreeData = subTreeRootAccessor.root

	if (!(subTreeData instanceof EntityListAccessor)) {
		throw new DataBindingError('Corrupted data')
	}
	const filteredData = subTreeData.entities.filter(
		(accessor): accessor is EntityAccessor => accessor instanceof EntityAccessor && !!accessor.getPersistedKey(),
	)

	const optionEntities: EntityAccessor[] = []

	for (const entity of filteredData) {
		optionEntities.push(getNestedEntity(entity, toOneProps))
	}

	const entities = currentValueEntity instanceof EntityListAccessor ? currentValueEntity.entities : [currentValueEntity]

	const currentValues: ChoiceFieldData.ValueRepresentation[] = []

	for (const entity of entities) {
		if (entity instanceof EntityAccessor) {
			const currentKey = entity.getKey()
			const index = filteredData.findIndex(entity => {
				const key = entity.getPersistedKey()
				return !!key && key === currentKey
			})
			if (index > -1) {
				currentValues.push(index)
			}
		}
	}

	const normalizedData = optionEntities.map(
		(item, i): ChoiceFieldData.SingleDatum => {
			let label: React.ReactNode

			if (props.optionFieldFactory) {
				label = <ToOne.AccessorRenderer accessor={item}>{props.optionFieldFactory}</ToOne.AccessorRenderer>
			} else if ('fieldName' in parsedOptions) {
				const field = item.data.getField(parsedOptions.fieldName)
				label = field instanceof FieldAccessor ? (field.currentValue as React.ReactNode) : null
			}

			return {
				key: i,
				label,

				// We can get away with the "!" since this collection was created from filteredData above.
				// If this is actually an unpersisted entity, we've got a huge problem.
				actualValue: item.getPersistedKey()!,
			}
		},
	)

	const baseMetadata: ChoiceFieldData.BaseChoiceMetadata = {
		...props,
		data: normalizedData,
		errors: currentValueEntity.errors,
	}

	if (props.arity === ChoiceFieldData.ChoiceArity.Multiple) {
		return props.children({
			...baseMetadata,
			currentValues: currentValues,
			onChange: (optionKey: ChoiceFieldData.ValueRepresentation, isChosen: boolean) => {
				if (currentValueEntity instanceof EntityListAccessor && currentValueEntity.addNew) {
					if (isChosen) {
						currentValueEntity.addNew(optionEntities[optionKey])
					} else {
						const targetEntityId = optionEntities[optionKey].getPersistedKey()

						for (const searchedEntity of currentValueEntity.entities) {
							if (!(searchedEntity instanceof EntityAccessor)) {
								continue
							}
							if (searchedEntity.getPersistedKey() === targetEntityId) {
								searchedEntity.remove && searchedEntity.remove(EntityAccessor.RemovalType.Disconnect)
								break
							}
						}
					}
				}
			},
		})
	} else if (props.arity === ChoiceFieldData.ChoiceArity.Single) {
		// No idea why this cast is necessary. TS is just being silly here…
		return props.children({
			...baseMetadata,
			currentValue: currentValues.length ? currentValues[0] : -1,
			onChange: (newValue: ChoiceFieldData.ValueRepresentation) => {
				const entity = entities[0]
				if (entity === undefined) {
					return
				}

				if (newValue === -1) {
					if (entity instanceof EntityAccessor && entity.remove) {
						entity.remove(EntityAccessor.RemovalType.Disconnect)
					}
				} else {
					entity.replaceWith && entity.replaceWith(filteredData[newValue])
				}
			},
		})
	}
	assertNever(props)
})
DynamicChoiceFieldImplementation.displayName = 'DynamicChoiceFieldImplementation'
