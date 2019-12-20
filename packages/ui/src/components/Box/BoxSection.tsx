import cn from 'classnames'
import * as React from 'react'
import { IncreaseHeadingDepth, useClassNamePrefix } from '../../auxiliary'
import { BoxDepthContext, HeadingDepthContext } from '../../contexts'
import { toViewClass } from '../../utils'
import { Heading } from '../Heading'
import { Icon } from '../Icon'

export interface BoxSectionProps {
	heading: React.ReactNode
	actions?: React.ReactNode
	children: React.ReactNode
	dragHandleComponent?: React.ComponentType<{ children: React.ReactNode }>
}

export const BoxSection = React.memo(({ actions, children, heading, dragHandleComponent: Handle }: BoxSectionProps) => {
	const boxDepth = React.useContext(BoxDepthContext)
	const headingDepth = React.useContext(HeadingDepthContext)
	const prefix = useClassNamePrefix()

	return (
		<div
			className={cn(
				`${prefix}box-section`,
				toViewClass(`depth-${Math.max(boxDepth - 1, 1)}`, true),
				toViewClass('hasHeading', !!heading),
				toViewClass('hasActions', !!actions),
			)}
		>
			{Handle && (
				<div className={`${prefix}box-section-handle`}>
					<Handle>
						<Icon blueprintIcon="drag-handle-vertical" />
					</Handle>
				</div>
			)}
			{heading && (
				<div className={`${prefix}box-section-heading`}>
					<Heading depth={headingDepth} size="small">
						{heading}
					</Heading>
				</div>
			)}
			{actions && <div className={`${prefix}box-section-actions`}>{actions}</div>}
			<div className={`${prefix}box-section-content`}>
				<IncreaseHeadingDepth currentDepth={headingDepth}>{children}</IncreaseHeadingDepth>
			</div>
		</div>
	)
})
BoxSection.displayName = 'BoxSection'
