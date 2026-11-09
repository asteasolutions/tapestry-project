import z from 'zod/v4'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { config } from '../../config.js'
import { findUserIdOrStartRegistration } from '../index.js'
import { BaseTokenResponseSchema, exchangeCodeForToken } from './oauth.js'
import { Response } from 'express'
import { RegisterUserSuggestionsSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/session.js'

const OrcidTokenResponseSchema = BaseTokenResponseSchema.extend({
  name: z.string().nullish(),
  orcid: z.string(),
})

type OrcidCredentials = SessionCreateDto & { authType: 'orcid' }

export class OrcidAuthProvider implements AuthProvider<OrcidCredentials> {
  async login({ code, redirectUri }: OrcidCredentials, response: Response) {
    const { orcid, name } = await exchangeCodeForToken(
      {
        tokenUrl: `${config.server.orcid.baseUrl}/oauth/token`,
        clientId: config.server.orcid.clientId,
        clientSecret: config.server.orcid.clientSecret,
        code,
        redirectUri,
      },
      OrcidTokenResponseSchema,
    )

    const [first = '', ...rest] = name?.trim().split(/\s+/) ?? []
    const registrationSuggestions = RegisterUserSuggestionsSchema.parse({
      usernameSuggestion: first.toLowerCase(),
      firstNameSuggestion: first,
      lastNameSuggestion: rest.join(' '),
    })

    return findUserIdOrStartRegistration(
      { orcidId: orcid },
      { orcidId: orcid, avatar: null },
      response,
      registrationSuggestions,
    )
  }
}
