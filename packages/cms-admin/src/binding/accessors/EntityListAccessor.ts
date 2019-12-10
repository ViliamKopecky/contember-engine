import { Accessor } from './Accessor'
import { EntityAccessor } from './EntityAccessor'
import { EntityForRemovalAccessor } from './EntityForRemovalAccessor'
import { Errorable } from './Errorable'
import { ErrorAccessor } from './ErrorAccessor'

export class EntityListAccessor extends Accessor implements Errorable {
	private _filteredEntities: EntityAccessor[] | undefined

	public constructor(
		public readonly entities: Array<EntityAccessor | EntityForRemovalAccessor | undefined>, // Undefined is a "hole" after an non-persisted entity
		public readonly errors: ErrorAccessor[],
		public readonly batchUpdates?: (performUpdates: (getAccessor: () => EntityListAccessor) => void) => void,
		public readonly addNew?: (
			newEntity?: EntityAccessor | ((getAccessor: () => EntityListAccessor, newIndex: number) => void),
		) => void,
	) {
		super()
	}

	/**
	 * ⚠ Important ⚠
	 * The indexes of the resulting array *MIGHT NOT* correspond to the indexes of the original entities array.
	 */
	public getFilteredEntities(): EntityAccessor[] {
		if (this._filteredEntities === undefined) {
			this._filteredEntities = this.entities.filter((entity): entity is EntityAccessor => {
				return entity instanceof EntityAccessor
			})
		}
		return this._filteredEntities
	}

	public findByKey(key: string): EntityAccessor | EntityForRemovalAccessor | undefined {
		return this.entities.find(e => e?.getKey() === key)
	}
}
