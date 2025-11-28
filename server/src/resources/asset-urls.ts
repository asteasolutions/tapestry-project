import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from './base-resource.js'
import { importKey, s3Service, tapestryKey } from '../services/s3-service.js'
import { canEditTapestry } from './tapestries.js'
import { TYPE } from 'tapestry-core/src/data-format/export/index.js'

const CREATE_URL_EXPIRES_IN = 3600 // 1 hour

export const assetURLs: RESTResourceImpl<Resources['assetURLs'], never> = {
  accessPolicy: {
    canCreate: async ({ body }, { userId }) =>
      body.type === 'import' || (await canEditTapestry(userId, body.tapestryId)),
  },

  handlers: {
    create: async ({ body }) => {
      const ext =
        body.type === 'import' ? '.zip' : body.fileExtension === '' ? '' : `.${body.fileExtension}`
      const objectKey = `${crypto.randomUUID()}${ext}`
      const key =
        body.type === 'import'
          ? importKey(objectKey)
          : tapestryKey(body.tapestryId, objectKey, true)
      const mimeType = body.type === 'import' ? TYPE : body.mimeType

      return {
        presignedURL: await s3Service.getCreateObjectUrl(key, mimeType, CREATE_URL_EXPIRES_IN),
        key,
      }
    },
  },
}
