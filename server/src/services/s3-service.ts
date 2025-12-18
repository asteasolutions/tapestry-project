import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectCommandInput,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'
import { compact } from 'lodash-es'
import { fileExtension, isHTTPURL } from 'tapestry-core/src/utils.js'
import { RedisCache } from './redis.js'

const Bucket = config.aws.s3.bucketName

class S3Service {
  private s3Client: S3Client
  private cache = new RedisCache('s3')

  constructor() {
    const { endpointUrl, accessKeyId, secretAccessKey, region } = config.aws
    this.s3Client = new S3Client({
      endpoint: endpointUrl || undefined,
      region: region || undefined,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      forcePathStyle: config.aws.s3.forcePathStyle,
    })
  }

  private async getPresignedUrl(
    command: PutObjectCommand | GetObjectCommand,
    expiresIn: number,
  ): Promise<string> {
    return getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async getCreateObjectUrl(key: string, mimeType: string, expiresIn: number): Promise<string> {
    return this.getPresignedUrl(
      new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: mimeType,
      }),
      expiresIn,
    )
  }

  async getReadObjectUrl(
    key: string,
    expiresIn = config.server.assetReadUrlExpiresIn,
  ): Promise<string> {
    return this.cache.memoize(
      key,
      () =>
        this.getPresignedUrl(
          new GetObjectCommand({
            Bucket,
            Key: key,
          }),
          expiresIn,
        ),
      expiresIn >> 1,
      async (cachedUrl) => {
        try {
          const response = await fetch(cachedUrl, { headers: { Range: 'bytes=0-0' } })
          return response.ok
        } catch (error) {
          console.error('Error while validating cached URL', error)
          return false
        }
      },
      config.server.assetReadUrlValidationExpiresIn,
    )
  }

  async copyObject(key: string, newObjectKey: string) {
    return this.s3Client.send(
      new CopyObjectCommand({
        Bucket,
        CopySource: `/${Bucket}/${key}`,
        Key: newObjectKey,
      }),
    )
  }

  async putObject(key: string, body: PutObjectCommandInput['Body'], contentType?: string) {
    return this.s3Client.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  async deleteObject(key: string) {
    try {
      return this.s3Client.send(
        new DeleteObjectCommand({
          Bucket,
          Key: key,
        }),
      )
    } catch (e) {
      console.warn(`There was an error deleting ${key} from S3`, e)
      throw e
    }
  }

  async tryDeleteObject(key: string) {
    try {
      await this.deleteObject(key)
    } catch (error) {
      console.warn('Ignoring error while deleting S3 object.', error)
    }
  }

  deleteObjects(keys: string[]) {
    if (keys.length === 0) {
      return
    }

    return this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    )
  }

  async *listBucket() {
    let token: string | undefined
    do {
      const { NextContinuationToken, Contents } = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket,
          ContinuationToken: token,
        }),
      )
      token = NextContinuationToken
      yield Contents
    } while (token)
  }

  async readObject(key: string) {
    return this.s3Client.send(
      new GetObjectCommand({
        Bucket,
        Key: key,
      }),
    )
  }
}

export function generateItemKey(tapestryId: string, item: string) {
  const [, ext] = fileExtension(item)

  return tapestryKey(tapestryId, `${crypto.randomUUID()}${ext ? `.${ext}` : ''}`, true)
}

export function tapestryKey(id: string, objectKey: string, isAsset = false) {
  return compact(['tapestries', id, isAsset ? 'assets' : null, objectKey]).join('/')
}

export function importKey(objectKey: string) {
  return `imports/${objectKey}`
}

export function extractInternallyHostedS3Key(url: string | null | undefined) {
  if (isHTTPURL(url)) {
    const { hostname, pathname } = new URL(url)
    const { hostname: awsHostname } = new URL(config.aws.endpointUrl || 'https://amazonaws.com')
    if (hostname.startsWith(`${config.aws.s3.bucketName}.s3.`) && hostname.endsWith(awsHostname)) {
      return pathname.slice(1)
    }
  }
  return undefined
}

export const s3Service = new S3Service()
