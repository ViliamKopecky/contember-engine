import { GraphQlBuilder } from '@contember/client'
import 'jasmine'
import React from 'react'
import { Environment } from '../../../../src/dao'
import { Parser } from '../../../../src/queryLanguage'

describe('query language parser', () => {
	it('should resolve variables adhering to the principle maximal munch', () => {
		const environment = Environment.create({
			ab: 456,
			a: 123,
			x: 'x',
			fieldVariable: 'fieldVariableName',
			literal: new GraphQlBuilder.Literal('literal'),
			dimensions: {},
		})
		expect(
			Parser.parseQueryLanguageExpression(
				'a(a=$a).$fieldVariable(ab = $ab, literalColumn = $literal).x(x = $x).foo',
				Parser.EntryPoint.RelativeSingleField,
				environment,
			),
		).toEqual({
			field: 'foo',
			hasOneRelationPath: [
				{
					field: 'a',
					filter: undefined,
					reducedBy: { a: 123 },
				},
				{
					field: 'fieldVariableName',
					filter: undefined,
					reducedBy: { ab: 456, literalColumn: new GraphQlBuilder.Literal('literal') },
				},
				{
					field: 'x',
					filter: undefined,
					reducedBy: { x: 'x' },
				},
			],
		})
	})
})
