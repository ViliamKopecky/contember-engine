import * as React from 'react'
import { AccessorTree, useAccessorTreeState } from '../accessorTree'
import { MarkerFactory } from '../queryLanguage'
import { SugaredUnconstrainedQualifiedEntityList } from '../treeParameters'
import { Component } from './Component'

export interface EntityCreatorProps extends SugaredUnconstrainedQualifiedEntityList {
	children: React.ReactNode
}

export const EntityCreator = Component<EntityCreatorProps>(
	props => {
		const children = React.useMemo(() => <EntityCreator {...props}>{props.children}</EntityCreator>, [props])
		const [accessorTreeState] = useAccessorTreeState({
			nodeTree: children,
		})

		return <AccessorTree state={accessorTreeState}>{props.children}</AccessorTree>
	},
	{
		generateMarkerTreeRoot: (props, fields, environment) =>
			MarkerFactory.createUnconstrainedMarkerTreeRoot(environment, props, fields),
	},
	'EntityCreator',
)
