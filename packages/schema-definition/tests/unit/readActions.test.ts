import { SchemaDefinition as def, ActionsDefinition as actions } from '../../src'
import { Model } from '@contember/schema'
import { expect, test } from 'vitest'
import { createActions } from '../../src/actions/definition'

namespace SimpleActions {

	@actions.watch({
		name: 'book_watch',
		watch: `
			title
			tags {
				name
			}
		`,
		priority: 100,
		webhook: '%webhookUrl%/book/updated',
	})
	export class Book {
		title = def.stringColumn()
		tags = def.manyHasMany(Tag)
		category = def.manyHasOne(Category)
	}

	export class Tag {
		locales = def.oneHasMany(TagLocale, 'tag')
	}

	@def.Unique('tag', 'locale')
	export class TagLocale {
		tag = def.manyHasOne(Tag, 'locales')
		name = def.stringColumn()
		locale = def.manyHasOne(Locale)
	}


	export class Category {
		locales = def.oneHasMany(CategoryLocale, 'category')
	}

	@def.Unique('category', 'locale')
	export class CategoryLocale {
		category = def.manyHasOne(Category, 'locales')
		name = def.stringColumn()
		locale = def.manyHasOne(Locale)
	}

	export class Locale {
		code = def.stringColumn().notNull().unique()
	}
}

test('read actions schema', () => {
	expect(createActions(SimpleActions)).toMatchInlineSnapshot(`
		{
		  "targets": {
		    "book_watch_target": {
		      "name": "book_watch_target",
		      "type": "webhook",
		      "url": "%webhookUrl%/book/updated",
		    },
		  },
		  "triggers": {
		    "book_watch": {
		      "entity": "Book",
		      "name": "book_watch",
		      "priority": 100,
		      "selection": undefined,
		      "target": "book_watch_target",
		      "type": "watch",
		      "watch": [
		        "title",
		        [
		          "tags",
		          {},
		          [
		            "name",
		          ],
		        ],
		      ],
		    },
		  },
		}
	`)
})
