import 'jasmine'
import { Environment } from '../../../../src/dao'
import { Parser } from '../../../../src/queryLanguage'

const parse = (input: string) => {
	return Parser.parseQueryLanguageExpression(input, Parser.EntryPoint.QualifiedFieldList, new Environment())
}

describe('qualified field list QueryLanguage parser', () => {
	it('should parse a qualified field list in its simplest form', () => {
		expect(parse('Author.name')).toEqual({
			entityName: 'Author',
			filter: undefined,
			hasOneRelationPath: [],
			field: 'name',
		})
	})

	it('should parse a complete qualified field list', () => {
		expect(parse('Author[age > 20].son.name')).toEqual({
			entityName: 'Author',
			filter: {
				age: { gt: 20 },
			},
			hasOneRelationPath: [{ field: 'son', filter: undefined, reducedBy: undefined }],
			field: 'name',
		})
	})
})
