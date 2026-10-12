import z from 'zod/v4'
import { Response } from 'express'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { BaseTokenResponseSchema, exchangeCodeForToken } from './oauth.js'
import { config } from '../../config.js'
import { InvalidCredentialsError, ServerError } from '../../errors/index.js'
import { findUserIdOrStartRegistration } from '../index.js'

// Wikimedia returns only tokens here; the user's identity comes from the profile endpoint
const WikimediaTokenSchema = BaseTokenResponseSchema

// "sub" is the stable central user id; "username" can be changed by the user
const WikimediaProfileSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(String),
  username: z.string(),
  email: z.string().nullish(),
})

async function fetchWikimediaProfile(code: string, redirectUri: string) {
  const { baseUrl, clientId, clientSecret } = config.server.wikimedia

  const { access_token } = await exchangeCodeForToken(
    {
      tokenUrl: `${baseUrl}/w/rest.php/oauth2/access_token`,
      clientId,
      clientSecret,
      code,
      redirectUri,
    },
    WikimediaTokenSchema,
  )

  try {
    const response = await fetch(`${baseUrl}/w/rest.php/oauth2/resource/profile`, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new InvalidCredentialsError()
    }
    return WikimediaProfileSchema.parse(await response.json())
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw error
    }
    console.error('Error while fetching Wikimedia profile', error)
    throw new ServerError()
  }
}

type WikimediaCredentials = SessionCreateDto & { authType: 'wikimedia' }

export class WikimediaAuthProvider implements AuthProvider<WikimediaCredentials> {
  async login({ code, redirectUri }: WikimediaCredentials, response: Response) {
    const profile = await fetchWikimediaProfile(code, redirectUri)

    return findUserIdOrStartRegistration(
      { wikimediaId: profile.sub },
      {
        wikimediaId: profile.sub,
        //Currently the email is unique so we don't want to set it for now in order to
        //prevent unique constraint violation for users who wants to join with
        //wikimedia and another provider (ia, google) using the same email.
        //email: profile.email || `${profile.sub}@wikimedia.org`,
        avatar: null,
      },
      response,
      { usernameSuggestion: profile.username },
    )
  }
}
