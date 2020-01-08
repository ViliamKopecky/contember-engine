import * as React from 'react'
import { Environment } from '../dao'
import { ConnectionMarker, EntityFields, FieldMarker, MarkerTreeRoot, ReferenceMarker } from '../markers'

export interface EnvironmentDeltaProvider<P extends {} = any> {
	generateEnvironment: (props: P, oldEnvironment: Environment) => Environment
}

/*
 * Components may also return EntityFields which serve as something of a Fragment on the Marker level.
 */

export interface FieldMarkerProvider<P extends {} = any> {
	// It may also return a ReferenceMarker so as to facilitate implementation of conditionally nested fields
	generateFieldMarker: (props: P, environment: Environment) => FieldMarker | ReferenceMarker | EntityFields
}

export interface MarkerTreeRootProvider<P extends {} = any> {
	generateMarkerTreeRoot: (
		props: P,
		fields: MarkerTreeRoot['fields'],
		environment: Environment,
	) => MarkerTreeRoot | EntityFields
}

export interface ReferenceMarkerProvider<P extends {} = any> {
	generateReferenceMarker: (
		props: P,
		fields: ReferenceMarker.Reference['fields'],
		environment: Environment,
	) => ReferenceMarker | EntityFields
}

export interface ConnectionMarkerProvider<P extends {} = any> {
	// It may also return a ReferenceMarker so as to facilitate implementation of conditionally nested connections
	generateConnectionMarker: (props: P, environment: Environment) => ConnectionMarker | ReferenceMarker | EntityFields
}

export interface SyntheticChildrenProvider<P extends {} = any> {
	generateSyntheticChildren: (props: P, environment: Environment) => React.ReactNode
}

export type CompleteMarkerProvider<P extends {} = any> = EnvironmentDeltaProvider<P> &
	FieldMarkerProvider<P> &
	MarkerTreeRootProvider<P> &
	ReferenceMarkerProvider<P> &
	ConnectionMarkerProvider<P> &
	SyntheticChildrenProvider<P>

export type MarkerProvider<P extends {} = any> = Partial<CompleteMarkerProvider<P>>
