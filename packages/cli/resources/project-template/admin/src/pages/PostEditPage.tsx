import { EditPage, NavigateBackButton } from '@contember/admin'
import * as React from 'react'
import { PostForm } from '../forms'

export const PostEditPage = (
	<EditPage
		entityName="Post"
		where="(id = $id)"
		pageName={'postEdit'}
		rendererProps={{
			title: 'Edit post',
			navigation: <NavigateBackButton to="postList">Posts</NavigateBackButton>,
		}}
	>
		<PostForm />
	</EditPage>
)
