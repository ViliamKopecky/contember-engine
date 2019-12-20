import * as React from 'react'
import { Component, DataBindingError, Field, HasMany, HasManyProps, useRelativeEntityList } from '../../../../binding'
import { RepeaterInner, RepeaterInnerProps } from './RepeaterInner'

export interface RepeaterProps extends HasManyProps, Omit<RepeaterInnerProps, 'entityList'> {
	initialRowCount?: number
}

export const Repeater = Component<RepeaterProps>(
	props => {
		if (process.env.NODE_ENV === 'development') {
			if ('sortableBy' in props && 'orderBy' in props) {
				throw new DataBindingError(
					`Incorrect <Repeater /> use: cannot supply both the 'orderBy' and the 'sortableBy' properties.\n` +
						`\tTo allow the user to interactively order the rows, use 'sortableBy'.\n` +
						`\tTo control the order in which the items are automatically displayed, use 'orderBy'.`,
				)
			}
		}

		const entityList = useRelativeEntityList(props)

		return <RepeaterInner {...props} entityList={entityList} />
	},
	props => (
		<HasMany
			{...props}
			preferences={{
				initialEntityCount: props.initialRowCount === undefined ? 1 : props.initialRowCount,
			}}
		>
			<RepeaterInner {...props} entityList={undefined as any} />
		</HasMany>
	),
	'Repeater',
)
