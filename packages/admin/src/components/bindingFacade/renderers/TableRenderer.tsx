import { Box, Table, TableCell, TableProps, TableRow, TableRowProps } from '@contember/ui'
import * as React from 'react'
import { Component, EntityAccessor } from '@contember/binding'
import { EmptyMessage, RemoveEntityButton } from '../collections/helpers'
import { RepeaterContainerProps, RepeaterItemProps } from '../collections/Repeater'
import { ImmutableContentLayoutRenderer, ImmutableContentLayoutRendererProps } from './ImmutableContentLayoutRenderer'
import { ImmutableEntityListRenderer, ImmutableEntityListRendererProps } from './ImmutableEntityListRenderer'

export interface TableRendererProps
	extends ImmutableContentLayoutRendererProps,
		Omit<ImmutableEntityListRendererProps, 'wrapperComponent'> {
	tableProps?: Omit<TableProps, 'children'>
	tableRowProps?: Omit<TableRowProps, 'children'>
	enableRemove?: boolean
}

export const TableRenderer = Component<TableRendererProps>(
	({
		enableRemove = true,
		children,
		side,
		title,
		navigation,
		headingProps,
		actions,
		tableProps,
		tableRowProps,
		...entityListProps
	}) => {
		return (
			<ImmutableContentLayoutRenderer
				side={side}
				title={title}
				navigation={navigation}
				actions={actions}
				headingProps={headingProps}
			>
				<ImmutableEntityListRenderer
					{...entityListProps}
					containerComponent={Container}
					containerComponentExtraProps={tableProps}
					itemComponent={Row}
					itemComponentExtraProps={tableRowProps}
				>
					{children}
				</ImmutableEntityListRenderer>
			</ImmutableContentLayoutRenderer>
		)
	},
	'TableRenderer',
)

const EmptyTable = React.memo((props: { children: React.ReactNode }) => (
	<Box>
		<EmptyMessage>{props.children}</EmptyMessage>
	</Box>
))
EmptyTable.displayName = 'EmptyTable'

const Container = React.memo((props: RepeaterContainerProps & Omit<TableProps, 'children'>) => {
	// TODO solve this via preferences
	const isEmpty = !props.entityList.entities.some(entity => entity instanceof EntityAccessor && entity.isPersisted())

	if (isEmpty) {
		const EmptyMessageComponent = props.emptyMessageComponent || EmptyTable
		return (
			<EmptyMessageComponent {...props.emptyMessageComponentExtraProps}>
				{props.emptyMessage || 'There are no items to display.'}
			</EmptyMessageComponent>
		)
	}

	return <Table {...props} />
})
Container.displayName = 'Container'

const Row = React.memo((props: RepeaterItemProps & Omit<TableRowProps, 'children'> & { enableRemove?: boolean }) => (
	<TableRow {...props}>
		{props.children}
		{props.enableRemove !== false && (
			<TableCell shrunk>
				<RemoveEntityButton removalType="delete" immediatePersist={true} />
			</TableCell>
		)}
	</TableRow>
))
Row.displayName = 'Row'
