import { wrapIdentifier } from '../../utils'
import { Literal } from '../../Literal'
import { QueryBuilder } from '../QueryBuilder'
import { SelectBuilder } from '../SelectBuilder'
import { Compiler } from '../Compiler'

type LiteralFactory = (context: Compiler.Context) => Literal

namespace With {
	export class Statement {
		constructor(public readonly ctes: { [alias: string]: LiteralFactory }) {}

		public compile(context: Compiler.Context): [Literal, Compiler.Context] {
			const ctes = Object.entries(this.ctes)
			if (ctes.length === 0) {
				return [new Literal(''), context]
			}
			const literal = new Literal('with ').appendAll(
				ctes.map(([alias, expr]) => {
					const literal = expr(context)
					context = context.withAlias(alias)
					return new Literal(wrapIdentifier(alias) + ' as (' + literal.sql + ')', literal.parameters)
				}),
				', ',
			)
			return [literal, context]
		}

		public withCte(alias: string, expression: LiteralFactory): Statement {
			return new Statement({ ...this.ctes, [alias]: expression })
		}

		public includes(alias: string): boolean {
			return this.getAliases().includes(alias)
		}

		public getAliases(): string[] {
			return Object.keys(this.ctes)
		}
	}

	export interface Options {
		with: Statement
	}

	export type Expression = SelectBuilder.Callback | Literal | QueryBuilder

	export interface Aware {
		with(alias: string, expression: Expression): any
	}

	export function createLiteral(expr: Expression): LiteralFactory {
		if (typeof expr === 'function') {
			return ctx => expr(SelectBuilder.create()).createQuery(ctx)
		} else if (((expr: any): expr is QueryBuilder => 'createQuery' in expr)(expr)) {
			return ctx => expr.createQuery(ctx)
		} else {
			return () => expr
		}
	}
}

export { With }
