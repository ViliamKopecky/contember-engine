import { CrudQueryBuilder, GraphQlBuilder } from '@contember/client'
import { Input } from '@contember/schema'
import { EmbeddedActionsParser, Lexer } from 'chevrotain'
import { Environment } from '../dao'
import {
	DesugaredHasManyRelation,
	DesugaredHasOneRelation,
	DesugaredQualifiedEntityList,
	DesugaredQualifiedFieldList,
	DesugaredQualifiedSingleEntity,
	DesugaredRelativeEntityList,
	DesugaredRelativeSingleEntity,
	DesugaredRelativeSingleField,
	DesugaredUnconstrainedQualifiedEntityList,
	EntityName,
	FieldName,
	Filter,
	OrderBy,
	UniqueWhere,
} from '../treeParameters'
import { QueryLanguageError } from './QueryLanguageError'
import { tokenList, TokenRegExps, tokens } from './tokenList'

/**
 * TODO:
 * 	- double quoted strings
 * 	- parentheses within non-unique where
 * 	- predicate negation
 * 	- collections (objects & lists)
 * 	- collection operators (e.g. 'in', 'notIn', etc.)
 * 	- filtering toOne
 */
class Parser extends EmbeddedActionsParser {
	private static rawInput: string = ''
	private static lexer = new Lexer(tokenList)
	private static parser = new Parser()
	private static environment: Environment = new Environment()

	private qualifiedEntityList = this.RULE<DesugaredQualifiedEntityList>('qualifiedEntityList', () => {
		const entityName = this.SUBRULE(this.entityIdentifier)
		const filter = this.OPTION(() => this.SUBRULE(this.nonUniqueWhere))

		const hasOneRelationPath: DesugaredHasOneRelation[] = []

		this.MANY(() => {
			this.CONSUME(tokens.Dot)
			hasOneRelationPath.push(this.SUBRULE(this.hasOneRelation))
		})

		return {
			entityName,
			filter,
			hasOneRelationPath,
		}
	})

	private qualifiedFieldList = this.RULE<DesugaredQualifiedFieldList>('qualifiedFieldList', () => {
		const entityName = this.SUBRULE(this.entityIdentifier)
		const filter = this.OPTION(() => this.SUBRULE(this.nonUniqueWhere))

		this.CONSUME(tokens.Dot)

		const { hasOneRelationPath, field } = this.SUBRULE(this.relativeSingleField)

		return {
			entityName,
			field,
			filter,
			hasOneRelationPath,
		}
	})

	private qualifiedSingleEntity = this.RULE<DesugaredQualifiedSingleEntity>('qualifiedSingleEntity', () => {
		const entityName = this.SUBRULE(this.entityIdentifier)

		// TODO this will probably go away once we support singleton entities
		const where = this.SUBRULE(this.uniqueWhere)
		const filter = this.OPTION(() => this.SUBRULE(this.nonUniqueWhere))
		const { hasOneRelationPath } = this.SUBRULE(this.relativeSingleEntity)

		return {
			entityName,
			where,
			hasOneRelationPath,
			filter,
		}
	})

	private unconstrainedQualifiedEntityList = this.RULE<DesugaredUnconstrainedQualifiedEntityList>(
		'unconstrainedQualifiedEntityList',
		() => {
			const entityName = this.SUBRULE(this.entityIdentifier)
			const { hasOneRelationPath } = this.SUBRULE(this.relativeSingleEntity)

			return {
				entityName,
				hasOneRelationPath,
			}
		},
	)

	private relativeSingleField = this.RULE<DesugaredRelativeSingleField>('relativeSingleField', () => {
		let { hasOneRelationPath } = this.SUBRULE(this.relativeSingleEntity)

		const last = this.ACTION(() => hasOneRelationPath.pop()!)

		this.ACTION(() => {
			if (last.reducedBy !== undefined || last.filter !== undefined) {
				throw new QueryLanguageError(
					`Cannot parse '${Parser.rawInput}': the last field '${last.field}' is being reduced or filtered, which, grammatically, makes it a relation but a single field is expected.`,
				)
			}
		})

		const field = this.ACTION(() => last.field)

		return {
			hasOneRelationPath,
			field,
		}
	})

	private relativeSingleEntity = this.RULE<DesugaredRelativeSingleEntity>('relativeSingleEntity', () => {
		const hasOneRelationPath: DesugaredHasOneRelation[] = []

		this.AT_LEAST_ONE_SEP({
			SEP: tokens.Dot,
			DEF: () => {
				hasOneRelationPath.push(this.SUBRULE(this.hasOneRelation))
			},
		})

		return {
			hasOneRelationPath,
		}
	})

	private relativeEntityList = this.RULE<DesugaredRelativeEntityList>('relativeEntityList', () => {
		const { hasOneRelationPath, field } = this.SUBRULE(this.relativeSingleField)
		const filter = this.OPTION(() => this.SUBRULE(this.nonUniqueWhere))
		const hasManyRelation: DesugaredHasManyRelation = {
			field,
			filter,
		}

		return {
			hasOneRelationPath,
			hasManyRelation,
		}
	})

	private hasOneRelation = this.RULE<DesugaredHasOneRelation>('hasOneRelation', () => {
		const fieldName = this.SUBRULE(this.fieldName)
		const reducedBy = this.OPTION(() => this.SUBRULE(this.uniqueWhere))
		const filter = this.OPTION1(() => this.SUBRULE(this.nonUniqueWhere))
		const hasOneRelation: DesugaredHasOneRelation = {
			field: fieldName,
			filter,
			reducedBy,
		}

		return hasOneRelation
	})

	private nonUniqueWhere: () => Filter = this.RULE('nonUniqueWhere', () => {
		const cnfWhere: Filter[] = []

		this.AT_LEAST_ONE(() => {
			this.CONSUME(tokens.LeftBracket)

			cnfWhere.push(this.SUBRULE(this.disjunction))

			this.CONSUME(tokens.RightBracket)
		})
		if (cnfWhere.length === 1) {
			return cnfWhere[0]
		}
		return {
			and: cnfWhere,
		}
	})

	private disjunction: () => Filter = this.RULE('disjunction', () => {
		const conjunctions: Filter[] = []

		this.AT_LEAST_ONE_SEP({
			SEP: tokens.Or,
			DEF: () => {
				conjunctions.push(this.SUBRULE(this.conjunction))
			},
		})
		if (conjunctions.length === 1) {
			return conjunctions[0]
		}
		return {
			or: conjunctions,
		}
	})

	private conjunction: () => Filter = this.RULE('conjunction', () => {
		const negations: Filter[] = []

		this.AT_LEAST_ONE_SEP({
			SEP: tokens.And,
			DEF: () => {
				negations.push(this.SUBRULE(this.negation))
			},
		})
		if (negations.length === 1) {
			return negations[0]
		}
		return {
			and: negations,
		}
	})

	// TODO this is to naïve and needs rewriting
	private negation: () => Filter = this.RULE('negation', () => {
		return this.OR([
			{
				ALT: () => {
					this.CONSUME(tokens.Not)
					return {
						not: this.SUBRULE(this.fieldWhere),
					}
				},
			},
			{
				ALT: () => {
					return this.SUBRULE1(this.fieldWhere)
				},
			},
		])
	})

	private fieldWhere: () => Parser.AST.FieldWhere = this.RULE('fieldWhere', () => {
		const fields: FieldName[] = []

		this.AT_LEAST_ONE_SEP({
			SEP: tokens.Dot,
			DEF: () => {
				fields.push(this.SUBRULE(this.fieldIdentifier))
			},
		})

		const condition = this.SUBRULE(this.condition)

		let i = fields.length - 1
		let where: Parser.AST.FieldWhere = {
			[fields[i--]]: condition,
		}

		while (i >= 0) {
			where = {
				[fields[i--]]: where,
			}
		}

		return where
	})

	private condition: () => Parser.AST.Condition = this.RULE('condition', () => {
		const operator = this.SUBRULE(this.conditionOperator)
		const columnValue = this.SUBRULE(this.columnValue)
		const condition: Parser.AST.Condition = {}

		return this.ACTION(() => {
			if (columnValue === null) {
				if (operator === 'eq') {
					condition.null = true
				} else if (operator === 'notEq') {
					condition.null = false
				} else {
					throw new QueryLanguageError(`The null keyword as a right hand operand can only be tested for (in)equality.`)
				}
				return condition
			}
			condition[operator] = columnValue

			return condition
		})
	})

	private conditionOperator: () => Parser.AST.ConditionOperator = this.RULE<Parser.AST.ConditionOperator>(
		'conditionOperator',
		() => {
			return this.OR([
				{
					ALT: () => {
						this.CONSUME(tokens.Equals)
						return 'eq'
					},
				},
				{
					ALT: () => {
						this.CONSUME(tokens.NotEquals)
						return 'notEq'
					},
				},
				{
					ALT: () => {
						this.CONSUME(tokens.LowerThan)
						return 'lt'
					},
				},
				{
					ALT: () => {
						this.CONSUME(tokens.LowerEqual)
						return 'lte'
					},
				},
				{
					ALT: () => {
						this.CONSUME(tokens.GreaterThan)
						return 'gt'
					},
				},
				{
					ALT: () => {
						this.CONSUME(tokens.GreaterEqual)
						return 'gte'
					},
				},
			])
		},
	)

	private columnValue: () => Parser.AST.ColumnValue = this.RULE<Parser.AST.ColumnValue>('columnValue', () => {
		return this.OR([
			{
				ALT: () => {
					this.CONSUME(tokens.Null)
					return null
				},
			},
			{
				ALT: () => {
					this.CONSUME(tokens.True)
					return true
				},
			},
			{
				ALT: () => {
					this.CONSUME(tokens.False)
					return false
				},
			},
			{
				ALT: () => this.SUBRULE(this.primaryValue),
			},
		])
	})

	private uniqueWhere = this.RULE('uniqueWhere', () => {
		const where: UniqueWhere = {}

		this.CONSUME(tokens.LeftParenthesis)
		this.AT_LEAST_ONE_SEP({
			SEP: tokens.Comma,
			DEF: () => {
				const nestedFields: string[] = []
				this.AT_LEAST_ONE_SEP1({
					SEP: tokens.Dot,
					DEF: () => {
						nestedFields.push(this.SUBRULE(this.fieldIdentifier))
					},
				})
				this.CONSUME(tokens.Equals)
				const primaryValue = this.SUBRULE<Input.PrimaryValue<GraphQlBuilder.Literal>>(this.primaryValue)

				this.ACTION(() => {
					let nestedWhere = where
					for (let i = 0, len = nestedFields.length; i < len; i++) {
						const nestedField = nestedFields[i]

						const isLast = len - 1 === i

						if (isLast) {
							if (nestedField in nestedWhere) {
								throw new QueryLanguageError(`Duplicate '${nestedFields.slice(0, i + 1).join('.')}' field`)
							}

							nestedWhere[nestedField] = primaryValue
						} else {
							if (nestedField in nestedWhere) {
								const existingWhere = nestedWhere[nestedField]

								if (typeof existingWhere === 'object' && !(existingWhere instanceof GraphQlBuilder.Literal)) {
									nestedWhere = existingWhere
								} else {
									throw new QueryLanguageError(
										`Malformed expression: cannot simultaneously treat the '${nestedFields
											.slice(0, i + 1)
											.join('.')}' ` + `field as a scalar as well as a relation.`,
									)
								}
							} else {
								const newWhere = {}
								nestedWhere[nestedField] = newWhere
								nestedWhere = newWhere
							}
						}
					}
				})
			},
		})
		this.CONSUME(tokens.RightParenthesis)

		return where
	})

	private orderBy: () => Input.OrderBy<CrudQueryBuilder.OrderDirection>[] = this.RULE<
		Input.OrderBy<CrudQueryBuilder.OrderDirection>[]
	>('orderBy', () => {
		const order: Input.OrderBy<CrudQueryBuilder.OrderDirection>[] = []

		this.AT_LEAST_ONE_SEP({
			SEP: tokens.Comma,
			DEF: () => {
				const fieldNames: FieldName[] = []
				this.AT_LEAST_ONE_SEP1({
					SEP: tokens.Dot,
					DEF: () => {
						fieldNames.push(this.SUBRULE(this.fieldIdentifier))
					},
				})
				let literal = this.OPTION(() => this.SUBRULE1(this.graphQlLiteral)) as
					| CrudQueryBuilder.OrderDirection
					| undefined

				this.ACTION(() => {
					if (literal) {
						if (literal.value !== 'asc' && literal.value !== 'desc') {
							throw new QueryLanguageError(`The only valid order directions are \`asc\` and \`desc\`.`)
						}
					} else {
						literal = new GraphQlBuilder.Literal('asc')
					}
					let orderBy: Input.FieldOrderBy<CrudQueryBuilder.OrderDirection> = literal

					for (let i = fieldNames.length - 1; i >= 0; i--) {
						orderBy = { [fieldNames[i]]: orderBy }
					}
					order.push(orderBy as Input.OrderBy<CrudQueryBuilder.OrderDirection>)
				})
			},
		})

		return order
	})

	private fieldName: () => FieldName = this.RULE<FieldName>('fieldName', () => {
		return this.OR([
			{
				ALT: () => this.SUBRULE(this.fieldIdentifier),
			},
		])
	})

	private primaryValue = this.RULE<Input.PrimaryValue<GraphQlBuilder.Literal>>('primaryValue', () => {
		return this.OR([
			{
				ALT: () => this.SUBRULE(this.string),
			},
			{
				ALT: () => this.SUBRULE(this.number),
			},
			{
				ALT: () => this.SUBRULE(this.graphQlLiteral),
			},
			{
				ALT: () => {
					const variableValue = this.SUBRULE(this.variable)
					return this.ACTION(() => {
						if (
							typeof variableValue === 'string' ||
							typeof variableValue === 'number' ||
							variableValue instanceof GraphQlBuilder.Literal
						) {
							return variableValue
						}
						throw new QueryLanguageError(
							`A variable can resolve to a literal, string or a number, not ${typeof variableValue}`,
						)
					})
				},
			},
		])
	})

	private fieldIdentifier: () => FieldName = this.RULE('fieldIdentifier', () => {
		return this.OR([
			{
				ALT: () => this.SUBRULE(this.identifier),
			},
			{
				ALT: () => {
					const variable = this.SUBRULE(this.variable)
					return this.ACTION(() => {
						if (!(typeof variable === 'string') || !TokenRegExps.identifier.test(variable)) {
							throw new QueryLanguageError(`The value \$${variable} is not a valid field identifier.`)
						}
						return variable
					})
				},
			},
		])
	})

	private identifier: () => string = this.RULE('identifier', () => {
		return this.CONSUME(tokens.Identifier).image
	})

	private entityIdentifier: () => EntityName = this.RULE('entityIdentifier', () => {
		return this.OR([
			{
				ALT: () => this.CONSUME(tokens.EntityIdentifier).image,
			},
			{
				ALT: () => {
					const variable = this.SUBRULE(this.variable)
					return this.ACTION(() => {
						if (!(typeof variable === 'string') || !TokenRegExps.entityIdentifier.test(variable)) {
							throw new QueryLanguageError(`The value of the variable \$${variable} is not a valid entity identifier.`)
						}
						return variable
					})
				},
			},
		])
	})

	private string = this.RULE('string', () => {
		const image = this.CONSUME(tokens.StringLiteral).image
		return image
			.substring(1, image.length - 1)
			.replace("\\'", "'")
			.replace('\\b', '\b')
			.replace('\\f', '\f')
			.replace('\\n', '\n')
			.replace('\\r', '\r')
			.replace('\\t', '\t')
			.replace('\\v', '\v')
	})

	private number = this.RULE('number', () => {
		return parseFloat(this.CONSUME(tokens.NumberLiteral).image)
	})

	private graphQlLiteral: () => GraphQlBuilder.Literal = this.RULE('graphQlLiteral', () => {
		const image = this.SUBRULE(this.identifier)

		return new GraphQlBuilder.Literal(image)
	})

	private variable = this.RULE<string | number | GraphQlBuilder.Literal>('variable', () => {
		this.CONSUME(tokens.DollarSign)
		const variableName = this.CONSUME(tokens.Identifier).image

		return this.ACTION(() => {
			if (Parser.environment.hasName(variableName)) {
				return Parser.environment.getValue(variableName)
			}
			if (Parser.environment.hasDimension(variableName)) {
				const dimensionValue = Parser.environment.getDimension(variableName)

				if (dimensionValue.length === 1) {
					return dimensionValue[0]
				}
				throw new QueryLanguageError(
					`The variable \$${variableName} resolved to a dimension which exists but contains ${dimensionValue.length} values. It has to contain exactly one. ` +
						`Perhaps you forgot to set the 'maxItems' prop of your DimensionsSwitcher?`,
				)
			}
			throw new QueryLanguageError(`Undefined variable \$${variableName}.`)
		})
	})

	private constructor() {
		super(tokenList, { outputCst: false, maxLookahead: 1 })
		this.performSelfAnalysis()
	}

	public static parseQueryLanguageExpression<E extends Parser.EntryPoint>(
		input: string,
		entry: E,
		environment: Environment,
	): Parser.ParserResult[E] {
		const lexingResult = Parser.lexer.tokenize((Parser.rawInput = input))

		if (lexingResult.errors.length !== 0) {
			throw new QueryLanguageError(
				`Failed to tokenize '${input}'.\n\n${lexingResult.errors.map(i => i.message).join('\n')}`,
			)
		}

		Parser.environment = environment
		Parser.parser.input = lexingResult.tokens

		let expression: Parser.ParserResult[keyof Parser.ParserResult]

		switch (entry) {
			case Parser.EntryPoint.RelativeSingleField:
				expression = Parser.parser.relativeSingleField()
				break
			case Parser.EntryPoint.RelativeSingleEntity:
				expression = Parser.parser.relativeSingleEntity()
				break
			case Parser.EntryPoint.RelativeEntityList:
				expression = Parser.parser.relativeEntityList()
				break
			case Parser.EntryPoint.QualifiedEntityList:
				expression = Parser.parser.qualifiedEntityList()
				break
			case Parser.EntryPoint.QualifiedFieldList:
				expression = Parser.parser.qualifiedFieldList()
				break
			case Parser.EntryPoint.QualifiedSingleEntity:
				expression = Parser.parser.qualifiedSingleEntity()
				break
			case Parser.EntryPoint.UnconstrainedQualifiedEntityList:
				expression = Parser.parser.unconstrainedQualifiedEntityList()
				break
			case Parser.EntryPoint.UniqueWhere:
				expression = Parser.parser.uniqueWhere()
				break
			case Parser.EntryPoint.Filter:
				expression = Parser.parser.nonUniqueWhere()
				break
			case Parser.EntryPoint.OrderBy:
				expression = Parser.parser.orderBy()
				break
			default:
				throw new QueryLanguageError(`Not implemented entry point '${entry}'`)
		}

		if (Parser.parser.errors.length !== 0) {
			throw new QueryLanguageError(
				`Failed to parse '${input}'.\n\n${Parser.parser.errors.map(i => i.message).join('\n')}`,
			)
		}

		return expression as Parser.ParserResult[E]
	}
}

namespace Parser {
	export namespace AST {
		export type FieldWhere = Input.FieldWhere<Condition>

		export type ColumnValue = Input.ColumnValue<GraphQlBuilder.Literal>

		export type Condition = Input.Condition<ColumnValue>

		export type ConditionOperator = keyof Pick<Condition, 'eq' | 'notEq' | 'lt' | 'lte' | 'gt' | 'gte'>
	}

	export enum EntryPoint {
		QualifiedEntityList = 'qualifiedEntityList', // E.g. Author[age < 123].son.sisters(name = 'Jane')
		QualifiedFieldList = 'qualifiedFieldList', // E.g. Author[age < 123].son.sister.name
		QualifiedSingleEntity = 'qualifiedSingleEntity', // E.g. Author(id = 123).son.sister
		UnconstrainedQualifiedEntityList = 'unconstrainedQualifiedEntityList', // E.g. Author.son.sister
		RelativeSingleField = 'relativeSingleField', // E.g. authors(id = 123).person.name
		RelativeSingleEntity = 'relativeSingleEntity', // E.g. localesByLocale(locale.slug = en)
		RelativeEntityList = 'relativeEntityList', // E.g. genres(slug = 'sciFi').authors[age < 123]
		UniqueWhere = 'uniqueWhere', // E.g. (author.mother.id = 123)
		Filter = 'filter', // E.g. [author.son.age < 123]
		OrderBy = 'orderBy', // E.g. items.order asc, items.content.name asc
	}

	export interface ParserResult {
		qualifiedEntityList: DesugaredQualifiedEntityList
		qualifiedFieldList: DesugaredQualifiedFieldList
		qualifiedSingleEntity: DesugaredQualifiedSingleEntity
		unconstrainedQualifiedEntityList: DesugaredUnconstrainedQualifiedEntityList
		relativeSingleField: DesugaredRelativeSingleField
		relativeSingleEntity: DesugaredRelativeSingleEntity
		relativeEntityList: DesugaredRelativeEntityList
		uniqueWhere: UniqueWhere
		filter: Filter
		orderBy: OrderBy
	}
}

export { Parser }
