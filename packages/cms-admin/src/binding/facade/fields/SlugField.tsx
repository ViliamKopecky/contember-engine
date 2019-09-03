import { FormGroup, TextInput } from '@contember/ui'
import slugify from '@sindresorhus/slugify'
import * as React from 'react'
import { RelativeSingleField } from '../../bindingTypes'
import { Field, useEntityContext, useEnvironment } from '../../coreComponents'
import { useMutationState } from '../../coreComponents/PersistState'
import { Environment } from '../../dao'
import { QueryLanguage } from '../../queryLanguage'
import { Component, SimpleRelativeSingleFieldProps } from '../auxiliary'
import { ConcealableField, ConcealableFieldProps } from '../ui'
import { useRelativeSingleField } from '../utils'

export type SlugFieldProps = Pick<ConcealableFieldProps, 'buttonProps' | 'concealTimeout'> &
	SimpleRelativeSingleFieldProps & {
		drivenBy: RelativeSingleField
		format?: (currentValue: string, environment: Environment) => string
		concealTimeout?: number
	}

export const SlugField = Component<SlugFieldProps>(
	({ buttonProps, concealTimeout, format, drivenBy, ...props }) => {
		const [hasEditedSlug, setHasEditedSlug] = React.useState(false)
		const hostEntity = useEntityContext() // TODO this will fail for some QL uses
		const slugField = useRelativeSingleField<string>(props.name)
		const driverField = useRelativeSingleField<string>(drivenBy)
		const environment = useEnvironment()
		const isMutating = useMutationState()

		let slugValue = slugField.currentValue || ''

		if (!hasEditedSlug && !hostEntity.isPersisted()) {
			slugValue = slugify(driverField.currentValue || '')

			if (format) {
				slugValue = format(slugValue, environment)
			}
		}

		React.useEffect(() => {
			if (slugField.currentValue === slugValue || !slugField.updateValue) {
				return
			}
			slugField.updateValue(slugValue)
		}, [slugField, slugValue])

		return (
			<ConcealableField
				renderConcealedValue={() => slugValue}
				buttonProps={buttonProps}
				concealTimeout={concealTimeout}
			>
				{({ inputRef, onFocus, onBlur }) => (
					<FormGroup
						label={props.label ? environment.applySystemMiddleware('labelMiddleware', props.label) : undefined}
						errors={slugField.errors}
						labelDescription={props.labelDescription}
						labelPosition={props.labelPosition || 'labelInlineLeft'}
						description={props.description}
						size="small"
						key="concealableField-formGroup"
					>
						<TextInput
							value={slugValue}
							onChange={e => {
								hasEditedSlug || setHasEditedSlug(true)
								slugField.updateValue && slugField.updateValue(e.target.value)
							}}
							readOnly={isMutating}
							validationState={slugField.errors.length ? 'invalid' : undefined}
							size="small"
							ref={inputRef}
							onFocus={onFocus}
							onBlur={onBlur}
							{...props}
						/>
					</FormGroup>
				)}
			</ConcealableField>
		)
	},
	(props, environment) => (
		<>
			{QueryLanguage.wrapRelativeSingleField(props.name, environment)}
			{QueryLanguage.wrapRelativeSingleField(props.drivenBy, environment)}
			{props.label}
		</>
	),
	'SlugField',
)