import GraphqlClient from '../model/GraphqlClient'
import { loginRequest } from '../state/request'
import { pushRequest } from './request'
import { ActionCreator } from './types'
import httpFetch from '../utils/httpFetch'
import { createAction } from 'redux-actions'
import {
	UPLOAD_FINISH,
	UPLOAD_SET_FAILURE,
	UPLOAD_START,
	UPLOAD_UPDATE_PROGRESS,
	UploadFinishPayload,
	UploadSetFailurePayload,
	UploadStartPayload,
	UploadUpdateProgressPayload,
} from '../reducer/upload'
import { UploadStatus } from '../state/upload'
import { readAsArrayBuffer } from '../utils/fileReader'

const mutation = `mutation ($contentType: String!) {
	generateUploadUrl(contentType: $contentType) {
		url
		publicUrl
		method
		headers {
			key
			value
		}
	}
}`

const startUpload = createAction<UploadStartPayload, string, File, string | undefined>(
	UPLOAD_START,
	(id, file, objectURL) => ({
		id,
		data: {
			status: UploadStatus.PREPARING,
			name: file.name,
			mime: file.type,
			size: file.size,
			objectURL,
		},
	}),
)
const setUploadFailed = createAction<UploadSetFailurePayload, string, string>(UPLOAD_SET_FAILURE, (id, reason) => ({
	id,
	reason,
}))
const updateUploadProgress = createAction<UploadUpdateProgressPayload, string, number | null>(
	UPLOAD_UPDATE_PROGRESS,
	(id, progress) => ({ id, progress }),
)
const finishUpload = createAction<UploadFinishPayload, string, string>(UPLOAD_FINISH, (id, resultUrl) => ({
	id,
	resultUrl,
}))

export const uploadFile = (id: string, file: File): ActionCreator<any> => async (
	dispatch,
	getState,
	services,
): Promise<any> => {
	const state = getState()
	if (!('stage' in state.request) || !('project' in state.request)) {
		return
	}
	const objectURL = URL.createObjectURL(file)

	dispatch(startUpload(id, file, objectURL))

	const apiToken = state.auth.identity ? state.auth.identity.token : undefined
	const graphqlClient = services.contentClientFactory.create(state.request.project, state.request.stage)

	let signedUpload: { url: string; publicUrl: string; method: string; headers: { key: string; value: string }[] }
	try {
		const variables = {
			contentType: file.type,
		}
		const result = await graphqlClient.request(mutation, variables, apiToken || undefined)

		signedUpload = result.generateUploadUrl
	} catch (error) {
		if (error instanceof GraphqlClient.GraphqlAuthenticationError) {
			dispatch(pushRequest(loginRequest()))
			return
		}
		dispatch(setUploadFailed(id, 'An error has occurred while obtaining upload URL'))
		throw error
	}

	const content = await readAsArrayBuffer(file)
	dispatch(updateUploadProgress(id, 0))
	try {
		const headers = signedUpload.headers.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {})
		await httpFetch(
			signedUpload.url,
			{
				method: signedUpload.method,
				headers,
				body: content,
			},
			{
				onUploadProgress: e => {
					dispatch(updateUploadProgress(id, e.lengthComputable ? (e.loaded / e.total) * 100 : null))
				},
			},
		)
	} catch (error) {
		dispatch(setUploadFailed(id, `An error has occurred while uploading a file`))
		throw error
	}
	dispatch(finishUpload(id, signedUpload.publicUrl))
	URL.revokeObjectURL(objectURL)
}
