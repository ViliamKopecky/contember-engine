import { SingleLineTextInputProps, TextInput } from '@contember/ui'
import * as React from 'react'
import { FieldAccessor } from '../../../binding'
import { SimpleRelativeSingleField, SimpleRelativeSingleFieldProps } from '../auxiliary'

export type NumberFieldProps = SimpleRelativeSingleFieldProps &
	Omit<SingleLineTextInputProps, 'value' | 'onChange' | 'validationState' | 'allowNewlines'>

export const NumberField = SimpleRelativeSingleField<NumberFieldProps, number>(
	(fieldMetadata, { defaultValue, ...props }) => {
		const generateOnChange = (data: FieldAccessor<number>) => (e: React.ChangeEvent<HTMLInputElement>) => {
			data.updateValue && data.updateValue(parseInt(e.target.value, 10))
		}
		return (
			<TextInput
				value={
					typeof fieldMetadata.field.currentValue === 'number' ? fieldMetadata.field.currentValue.toString(10) : '0'
				}
				onChange={generateOnChange(fieldMetadata.field)}
				validationState={fieldMetadata.field.errors.length ? 'invalid' : undefined}
				type="number"
				{...props}
			/>
		)
	},
	'NumberField',
)
