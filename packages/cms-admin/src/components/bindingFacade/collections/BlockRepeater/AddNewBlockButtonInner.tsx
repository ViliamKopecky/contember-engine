import { Button, ButtonGroup, DropdownRenderProps } from '@contember/ui'
import * as React from 'react'
import {
	EntityAccessor,
	getRelativeSingleField,
	SugaredRelativeSingleField,
	useDesugaredRelativeSingleField,
} from '../../../../binding'
import { NormalizedBlockProps } from '../../blocks'
import { AddNewEntityButtonProps } from '../helpers'

export interface AddNewBlockButtonInnerProps extends DropdownRenderProps, AddNewEntityButtonProps {
	normalizedBlockProps: NormalizedBlockProps[]
	discriminationField: string | SugaredRelativeSingleField
	isMutating: boolean
}

export const AddNewBlockButtonInner = React.memo<AddNewBlockButtonInnerProps>(props => {
	const desugaredDiscriminationField = useDesugaredRelativeSingleField(props.discriminationField)
	return (
		<ButtonGroup orientation="vertical">
			{props.normalizedBlockProps.map((blockProps, i) => (
				<Button
					key={i}
					distinction="seamless"
					flow="generousBlock"
					disabled={props.isMutating}
					onClick={() => {
						props.requestClose()
						const targetValue = blockProps.discriminateBy

						props.addNew?.((getAccessor, newIndex) => {
							const accessor = getAccessor()
							const newlyAdded = accessor.entities[newIndex] as EntityAccessor
							const discriminationField = getRelativeSingleField(newlyAdded, desugaredDiscriminationField)
							discriminationField.updateValue?.(targetValue)
						})
					}}
				>
					{!!blockProps.description && (
						<span>
							{blockProps.label}
							<br />
							<small>{blockProps.description}</small>
						</span>
					)}
					{!blockProps.description && blockProps.label}
				</Button>
			))}
		</ButtonGroup>
	)
})
AddNewBlockButtonInner.displayName = 'AddNewBlockButtonInner'
