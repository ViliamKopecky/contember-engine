import { assertNever } from '@contember/utils'
import * as React from 'react'
import {
	Component,
	DataBindingError,
	EntityAccessor,
	EntityListAccessor,
	EntityListDataProvider,
	Field,
	FieldAccessor,
	getRelativeEntityList,
	getRelativeSingleEntity,
	HasMany,
	HasOne,
	PRIMARY_KEY_NAME,
	QualifiedEntityList,
	QualifiedFieldList,
	QueryLanguage,
	RelativeEntityList,
	RelativeSingleEntity,
	SugaredQualifiedEntityList,
	SugaredQualifiedFieldList,
	SugaredRelativeEntityList,
	SugaredRelativeSingleEntity,
	useEntityContext,
	useEnvironment,
	useMutationState,
} from '../../../../binding'
import { ChoiceFieldData } from './ChoiceFieldData'

export type DynamicChoiceFieldProps<Arity extends ChoiceFieldData.ChoiceArity = ChoiceFieldData.ChoiceArity> = (
	| ({
			arity: 'single'
	  } & SugaredRelativeSingleEntity)
	| ({
			arity: 'multiple'
	  } & SugaredRelativeEntityList)
) &
	(
		| {
				renderOptionText: (entityAccessor: EntityAccessor) => string
				options: string | SugaredQualifiedEntityList['entities'] | SugaredQualifiedEntityList
				optionFieldStaticFactory: React.ReactNode
		  }
		| {
				options: string | SugaredQualifiedFieldList['fields'] | SugaredQualifiedFieldList
		  }
	)

// Now THIS, this is one of the nastiest hacks in the entire codebase 👏.
// TODO how to improve this though…? 🤔
const computeSubTreeIdentifier = (field: DynamicChoiceFieldProps['field']) => JSON.stringify(field)

export const useDynamicChoiceField = <Arity extends ChoiceFieldData.ChoiceArity>(
	props: DynamicChoiceFieldProps<Arity>,
): ChoiceFieldData.MetadataByArity[Arity] => {
	const parentEntity = useEntityContext()
	const environment = useEnvironment()
	const isMutating = useMutationState()
	const subTreeIdentifier = React.useMemo(() => computeSubTreeIdentifier(props.field), [props.field])
	const subTreeData = React.useMemo(() => {
		const subTree = parentEntity.data.getTreeRoot(subTreeIdentifier)

		if (!(subTree instanceof EntityListAccessor)) {
			throw new DataBindingError(`Something went horribly wrong. The options of a dynamic choice field are not a list.`)
		}
		return subTree
	}, [parentEntity.data, subTreeIdentifier])

	const desugaredRelativePath = React.useMemo<RelativeSingleEntity | RelativeEntityList>(() => {
		if (props.arity === 'single') {
			return QueryLanguage.desugarRelativeSingleEntity(props, environment)
		} else if (props.arity === 'multiple') {
			return QueryLanguage.desugarRelativeEntityList(props, environment)
		}
		assertNever(props)
	}, [environment, props])
	const desugaredOptionPath = React.useMemo<QualifiedFieldList | QualifiedEntityList>(() => {
		if ('renderOptionText' in props) {
			return QueryLanguage.desugarQualifiedEntityList(
				typeof props.options === 'string' || !('entities' in props.options)
					? {
							entities: props.options,
					  }
					: props.options,
				environment,
			)
		}
		return QueryLanguage.desugarQualifiedFieldList(
			typeof props.options === 'string' || !('fields' in props.options)
				? {
						fields: props.options,
				  }
				: props.options,
			environment,
		)
	}, [environment, props])
	const arity = props.arity
	const currentValueEntity: EntityListAccessor | EntityAccessor = React.useMemo(() => {
		if (arity === 'single') {
			return getRelativeSingleEntity(parentEntity, desugaredRelativePath as RelativeSingleEntity)
		} else if (arity === 'multiple') {
			return getRelativeEntityList(parentEntity, desugaredRelativePath as RelativeEntityList)
		}
		assertNever(arity)
	}, [parentEntity, desugaredRelativePath, arity])

	const filteredOptions = subTreeData.getFilteredEntities()

	const optionEntities = React.useMemo(() => {
		const entities: EntityAccessor[] = []
		for (const entity of filteredOptions) {
			entities.push(getRelativeSingleEntity(entity, desugaredRelativePath))
		}
		return entities
	}, [desugaredRelativePath, filteredOptions])

	const currentlyChosenEntities =
		currentValueEntity instanceof EntityListAccessor ? currentValueEntity.entities : [currentValueEntity]

	const currentValues = React.useMemo(() => {
		const values: ChoiceFieldData.ValueRepresentation[] = []

		for (const entity of currentlyChosenEntities) {
			if (entity instanceof EntityAccessor) {
				const currentKey = entity.getKey()
				const index = filteredOptions.findIndex(entity => {
					const key = entity.getPersistedKey()
					return !!key && key === currentKey
				})
				if (index > -1) {
					values.push(index)
				}
			}
		}

		return values
	}, [currentlyChosenEntities, filteredOptions])

	const normalizedData = React.useMemo(
		() =>
			optionEntities.map(
				(item, i): ChoiceFieldData.SingleDatum => {
					let label: string = ''

					if ('renderOptionText' in props) {
						if (props.renderOptionText) {
							label = props.renderOptionText(item)
						} else if (process.env.NODE_ENV === 'development') {
							throw new DataBindingError(
								`Cannot use a ChoiceField with custom fields but without providing the 'renderOptionText' prop.`,
							)
						}
					} else if ('name' in desugaredOptionPath) {
						const field = item.data.getField(desugaredOptionPath.name)
						label = field instanceof FieldAccessor && typeof field.currentValue === 'string' ? field.currentValue : ''
					}

					return {
						key: i,
						label,

						// We can get away with the "!" since this collection was created from filteredData above.
						// If this is actually an unpersisted entity, we've got a huge problem.
						actualValue: item.getPersistedKey()!,
					}
				},
			),
		[desugaredOptionPath, optionEntities, props],
	)

	const baseMetadata: ChoiceFieldData.BaseChoiceMetadata = {
		data: normalizedData,
		errors: currentValueEntity.errors,
		isMutating,
		environment,
	}

	if (props.arity === 'single') {
		const metadata: ChoiceFieldData.SingleChoiceFieldMetadata = {
			...baseMetadata,
			currentValue: currentValues.length ? currentValues[0] : -1,
			onChange: (newValue: ChoiceFieldData.ValueRepresentation) => {
				const entity = currentlyChosenEntities[0]
				if (entity === undefined) {
					return
				}

				if (newValue === -1) {
					if (entity instanceof EntityAccessor && entity.remove) {
						entity.remove('disconnect')
					}
				} else {
					entity.replaceWith && entity.replaceWith(filteredOptions[newValue])
				}
			},
		}
		return metadata as ChoiceFieldData.MetadataByArity[Arity]
	} else if (props.arity === 'multiple') {
		const metadata: ChoiceFieldData.MultipleChoiceFieldMetadata = {
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
								searchedEntity.remove && searchedEntity.remove('disconnect')
								break
							}
						}
					}
				}
			},
		}
		return metadata as ChoiceFieldData.MetadataByArity[Arity]
	}
	assertNever(props)
}

export const DynamicChoiceField = Component<DynamicChoiceFieldProps & ChoiceFieldData.MetadataPropsByArity>(
	props => {
		const metadata = useDynamicChoiceField(props)

		return props.children(metadata as any) // 🙁
	},
	(props: DynamicChoiceFieldProps, environment) => {
		let reference: React.ReactNode
		let entityListDataProvider: React.ReactNode

		const subTreeIdentifier = computeSubTreeIdentifier(props.field)

		const idField = <Field name={PRIMARY_KEY_NAME} />
		if (props.arity === 'single') {
			reference = <HasOne field={props.field}>{idField}</HasOne>
		} else if (props.arity === 'multiple') {
			reference = <HasMany field={props.field}>{idField}</HasMany>
		} else {
			assertNever(props)
		}

		if ('renderOptionText' in props) {
			const sugaredEntityList: SugaredQualifiedEntityList =
				typeof props.options === 'string' || !('entities' in props.options)
					? {
							entities: props.options,
					  }
					: props.options
			entityListDataProvider = (
				<EntityListDataProvider {...sugaredEntityList} subTreeIdentifier={subTreeIdentifier}>
					{props.optionFieldStaticFactory}
				</EntityListDataProvider>
			)
		} else {
			const sugaredFieldList: SugaredQualifiedFieldList =
				typeof props.options === 'string' || !('fields' in props.options)
					? {
							fields: props.options,
					  }
					: props.options
			const fieldList = QueryLanguage.desugarQualifiedFieldList(sugaredFieldList, environment)
			entityListDataProvider = (
				<EntityListDataProvider {...fieldList} entities={fieldList} subTreeIdentifier={subTreeIdentifier}>
					<Field name={fieldList.name} />
				</EntityListDataProvider>
			)
		}

		return (
			<>
				{entityListDataProvider}
				{reference}
			</>
		)
	},
	'DynamicChoiceField',
)
DynamicChoiceField.displayName = 'DynamicChoiceField'
