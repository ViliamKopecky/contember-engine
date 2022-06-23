import { test } from 'vitest'
import { execute } from '../../../../../src/test.js'
import { SchemaBuilder } from '@contember/schema-definition'
import { Model } from '@contember/schema'
import { GQL, SQL } from '../../../../../src/tags.js'
import { testUuid } from '../../../../../src/testUuid.js'

test('Post by category name (where many has many owning)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity.manyHasMany('categories', relation =>
					relation.target('Category', e => e.column('name', c => c.type(Model.ColumnType.String))),
				),
			)
			.buildSchema(),
		query: GQL`
        query {
          listPost(filter: {categories: {name: {eq: "Stuff"}}}) {
            id
          }
        }`,
		executes: [
			{
				sql: SQL`select "root_"."id" as "root_id"
                     from "public"."post" as "root_"
                     where exists (select 1
                                            from "public"."post_categories" as "junction_" inner join "public"."category" as "sub_" on "junction_"."category_id" = "sub_"."id"
                                            where "root_"."id" = "junction_"."post_id"  and "sub_"."name" = ?)`,
				parameters: ['Stuff'],
				response: {
					rows: [
						{
							root_id: testUuid(1),
						},
						{
							root_id: testUuid(3),
						},
					],
				},
			},
		],
		return: {
			data: {
				listPost: [
					{
						id: testUuid(1),
					},
					{
						id: testUuid(3),
					},
				],
			},
		},
	})
})

test('Post by category ids (where many has many owning)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity.manyHasMany('categories', relation =>
					relation.target('Category', e => e.column('name', c => c.type(Model.ColumnType.String))),
				),
			)
			.buildSchema(),
		query: GQL`
        query {
          listPost(filter: {categories: {id: {in: ["${testUuid(10)}", "${testUuid(11)}"]}}}) {
            id
          }
        }`,
		executes: [
			{
				sql: SQL`select "root_"."id" as "root_id"
                     from "public"."post" as "root_"
                     where exists (select 1
                                            from "public"."post_categories" as "junction_"
                                            where "root_"."id" = "junction_"."post_id" and "junction_"."category_id" in (?, ?))`,
				parameters: [testUuid(10), testUuid(11)],
				response: {
					rows: [
						{
							root_id: testUuid(1),
						},
						{
							root_id: testUuid(3),
						},
					],
				},
			},
		],
		return: {
			data: {
				listPost: [
					{
						id: testUuid(1),
					},
					{
						id: testUuid(3),
					},
				],
			},
		},
	})
})


test('Post by category tag name (where multiple many has many owning)', async () => {
	await execute({
		schema: new SchemaBuilder()
			.entity('Post', entity =>
				entity.manyHasMany('categories', relation =>
					relation.target('Category', e =>
						e.manyHasMany('tagsButWithVeryVeryVeryLongNameSoItReachesPostgresqlAliasLengthLimit', relation =>
							relation.target('Tag', e =>
								e.column('name', c => c.type(Model.ColumnType.String)),
							),
						),
					),
				),
			)
			.buildSchema(),
		query: GQL`
        query {
          listPost(filter: {categories: {tagsButWithVeryVeryVeryLongNameSoItReachesPostgresqlAliasLengthLimit: {name: {eq: "Stuff"}}}}) {
            id
          }
        }`,
		executes: [
			{
				sql: SQL`
					select "root_"."id" as "root_id"  from "public"."post" as "root_"
					where exists (select 1
						from "public"."post_categories" as "junction_"
						inner join  "public"."category" as "sub_" on  "junction_"."category_id" = "sub_"."id"
						left join  "public"."category_tags_but_with_very_very_very_long_name_so_it_reaches_postgresql_alias_length_limit" as "sub_x_sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresq_2" on  "sub_"."id" = "sub_x_sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresq_2"."category_id"
						left join  "public"."tag" as "sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresqlAlias_1" on  "sub_x_sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresq_2"."tag_id" = "sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresqlAlias_1"."id"
						where "root_"."id" = "junction_"."post_id" and "sub_tagsButWithVeryVeryVeryLongNameSoItReachesPostgresqlAlias_1"."name" = ?)`,
				parameters: ['Stuff'],
				response: {
					rows: [
						{
							root_id: testUuid(1),
						},
						{
							root_id: testUuid(3),
						},
					],
				},
			},
		],
		return: {
			data: {
				listPost: [
					{
						id: testUuid(1),
					},
					{
						id: testUuid(3),
					},
				],
			},
		},
	})
})
