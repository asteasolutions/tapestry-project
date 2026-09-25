import z from 'zod/v4'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session.js'
import { AuthProvider } from './index.js'
import { config } from '../../config.js'
import { InvalidCredentialsError, ServerError } from '../../errors/index.js'
import { updateUserIfExists } from '../index.js'
import { RegisterJWTData } from '../tokens.js'

// The ORCID OAuth2 "authenticated iD" flow only grants the /authenticate scope, which returns
// the user's ORCID iD and (optionally) their name. It does NOT return an email address, so we
// synthesize a stable, unique placeholder email from the ORCID iD to satisfy the User model.
// See https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/
const OrcidTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  name: z.string().nullish(),
  orcid: z.string(),
})

async function exchangeCodeForOrcid(code: string, redirectUri: string): Promise<RegisterJWTData> {
  let parsedResponse: z.infer<typeof OrcidTokenResponseSchema>

  try {
    const orcidResponse = await fetch(`${config.server.orcid.baseUrl}/oauth/token`, {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.server.orcid.clientId,
        client_secret: config.server.orcid.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!orcidResponse.ok) {
      throw new InvalidCredentialsError()
    }

    parsedResponse = OrcidTokenResponseSchema.parse(await orcidResponse.json())
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw error
    }
    console.error('Error while performing ORCID authentication', error)
    throw new ServerError()
  }

  const { orcid, name } = parsedResponse

  return {
    orcidId: orcid,
    email: `${orcid}@orcid.org`,
    givenName: name?.trim() || orcid,
    familyName: '',
    avatar: null,
  }
}

type OrcidCredentials = SessionCreateDto & { authType: 'orcid' }

export class OrcidAuthProvider implements AuthProvider<OrcidCredentials> {
  async login({ code, redirectUri }: OrcidCredentials) {
    const orcidUserData = await exchangeCodeForOrcid(code, redirectUri)

    return updateUserIfExists({ orcidId: orcidUserData.orcidId }, orcidUserData)
  }
}
