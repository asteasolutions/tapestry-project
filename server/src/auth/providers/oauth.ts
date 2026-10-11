import z from 'zod/v4'
import { InvalidCredentialsError, ServerError } from '../../errors'

export const BaseTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
})

//Here we have the common things for out OAuth providers
interface ExchangeCodeParams {
  tokenUrl: string
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}

//Here in ExchangeCodeParams we have the common things for out OAuth providers
export async function exchangeCodeForToken<T>(
  { tokenUrl, clientId, clientSecret, code, redirectUri }: ExchangeCodeParams,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await fetch(tokenUrl, {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      throw new InvalidCredentialsError()
    }

    return schema.parse(await response.json())
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw error
    }
    console.error('Error while exchanging OAuth authentication', error)
    throw new ServerError()
  }
}
