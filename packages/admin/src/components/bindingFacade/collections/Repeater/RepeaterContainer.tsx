import { Box, BoxSection } from '@contember/ui'
import * as React from 'react'
import { EntityListAccessor } from '../../../../binding'
import { AddNewEntityButton, AddNewEntityButtonProps, EmptyMessage, EmptyMessageProps } from '../helpers'

export interface RepeaterContainerProps {
	entityList: EntityListAccessor
	isEmpty: boolean
	label: React.ReactNode
	addNew: (preprocess?: (getAccessor: () => EntityListAccessor, newIndex: number) => void) => void

	children: React.ReactNode

	enableAddingNew?: boolean

	emptyMessage?: React.ReactNode
	emptyMessageComponent?: React.ComponentType<EmptyMessageProps & any> // This can override 'emptyMessage'
	emptyMessageComponentExtraProps?: {}

	addButtonText?: React.ReactNode
	addButtonProps?: AddNewEntityButtonProps // Children here override 'addButtonText'
	addButtonComponent?: React.ComponentType<AddNewEntityButtonProps & any> // This can override 'addButtonText' and 'addButtonProps'
	addButtonComponentExtraProps?: {}
}

export const RepeaterContainer = React.memo(
	({
		addNew,
		children,
		addButtonComponent: AddButton = AddNewEntityButton,
		addButtonComponentExtraProps,
		addButtonProps,
		addButtonText = 'Add',
		emptyMessage = 'There is nothing here. Try adding a new item.',
		emptyMessageComponent: EmptyMessageComponent = EmptyMessage,
		emptyMessageComponentExtraProps,
		enableAddingNew = true,
		isEmpty,
		label,
	}: RepeaterContainerProps) => {
		return (
			<Box heading={label}>
				{isEmpty && <EmptyMessageComponent {...emptyMessageComponentExtraProps}>{emptyMessage}</EmptyMessageComponent>}
				{isEmpty || children}
				{enableAddingNew && (
					<BoxSection heading={undefined}>
						<AddButton {...addButtonComponentExtraProps} children={addButtonText} {...addButtonProps} addNew={addNew} />
					</BoxSection>
				)}
			</Box>
		)
	},
)
RepeaterContainer.displayName = 'RepeaterContainer'
