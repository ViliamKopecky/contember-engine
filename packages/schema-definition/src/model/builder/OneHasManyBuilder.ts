import { Model } from '@contember/schema'
import FieldBuilder from './FieldBuilder'
import { AddEntityCallback, EntityConfigurator } from './SchemaBuilder'

type PartialOptions<K extends keyof OneHasManyBuilder.Options> = Partial<OneHasManyBuilder.Options> &
	Pick<OneHasManyBuilder.Options, K>

class OneHasManyBuilder<O extends PartialOptions<never> = PartialOptions<never>> implements FieldBuilder<O> {
	constructor(private readonly options: O, private readonly addEntity: AddEntityCallback) {}

	target(target: string, configurator?: EntityConfigurator): OneHasManyBuilder<O & PartialOptions<'target'>> {
		if (configurator) {
			this.addEntity(target, configurator)
		}
		return this.withOption('target', target)
	}

	ownedBy(ownedBy: string): OneHasManyBuilder<O> {
		return this.withOption('ownedBy', ownedBy)
	}

	ownerJoiningColumn(columnName: string): OneHasManyBuilder<O> {
		return this.withOption('ownerJoiningColumn', { ...this.options.ownerJoiningColumn, columnName })
	}

	onDelete(onDelete: Model.OnDelete): OneHasManyBuilder<O> {
		return this.withOption('ownerJoiningColumn', { ...this.options.ownerJoiningColumn, onDelete })
	}

	ownerNotNull(): OneHasManyBuilder<O> {
		return this.withOption('ownerNullable', false)
	}

	ownerNullable(): OneHasManyBuilder<O> {
		return this.withOption('ownerNullable', true)
	}

	getOption(): O {
		return this.options
	}

	private withOption<K extends keyof OneHasManyBuilder.Options>(key: K, value: OneHasManyBuilder.Options[K]) {
		return new OneHasManyBuilder<O & PartialOptions<K>>(
			{ ...(this.options as object), [key]: value } as O & PartialOptions<K>,
			this.addEntity,
		)
	}
}

namespace OneHasManyBuilder {
	export type Options = {
		target: string
		ownedBy?: string
		ownerJoiningColumn?: Partial<Model.JoiningColumn>
		ownerNullable?: boolean
	}
}

export default OneHasManyBuilder