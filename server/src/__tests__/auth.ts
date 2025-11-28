import request from 'supertest'
import { app } from '../index.js'
import { createJWT } from '../auth/tokens.js'

export function loginUser(userId: string) {
  return request.agent(app).set('Authorization', `Bearer ${createJWT({ userId }, '1h')}`)
}
