/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import request from 'supertest'
import { prisma } from '../../db.js'
import { app } from '../../index.js'
import { loginUser } from '../auth.js'
import { generate, generateTapestry } from '../seed.js'
import { setupTestSuite, teardownTestSuite } from '../utils.js'
import { beforeAll, afterAll, test, expect, describe } from 'vitest'
import { REPORT_METRICS } from 'tapestry-shared/src/data-transfer/resources/dtos/admin.js'

let adminId: string

beforeAll(async () => {
  await setupTestSuite()
  adminId = (await generate('User', { role: 'admin' })).id
})

afterAll(teardownTestSuite)

async function tapestryWith(visibility: 'private' | 'link') {
  const { tapestry, owner, items } = await generateTapestry()
  // The data generator randomizes required booleans, so reset the featured flag explicitly
  await prisma.tapestry.update({
    where: { id: tapestry.id },
    data: { visibility, featured: false, galleryPosition: null },
  })
  return { tapestry, owner, items }
}

const privateTapestry = () => tapestryWith('private')
const linkTapestry = () => tapestryWith('link')

describe('access control', () => {
  test('regular users cannot use admin endpoints', async () => {
    const user = await generate('User', { role: 'user' })
    const { tapestry } = await privateTapestry()
    const asUser = loginUser(user.id)

    for (const path of [
      '/api/admin/tapestries',
      `/api/admin/tapestries/${tapestry.id}`,
      '/api/admin/users',
      '/api/admin/activity',
    ]) {
      expect((await asUser.get(path)).statusCode, path).toBe(403)
    }
    expect((await asUser.delete(`/api/admin/tapestries/${tapestry.id}`)).statusCode).toBe(403)
    expect(
      (await asUser.post('/api/admin/activity').send({ action: 'reorderGallery', tapestryIds: [] }))
        .statusCode,
    ).toBe(403)
    expect((await asUser.post('/api/admin/item-deletions').send({})).statusCode).toBe(404)
    expect(
      (
        await asUser
          .post('/api/admin/report-queries')
          .send({ metric: 'M-01', from: null, to: new Date(), compare: 'none' })
      ).statusCode,
    ).toBe(403)
    expect((await request(app).get('/api/admin/tapestries')).statusCode).toBe(401)
  })

  test('admins cannot open or edit private tapestries', async () => {
    const { tapestry, items } = await privateTapestry()
    const asAdmin = loginUser(adminId)

    expect((await asAdmin.get(`/api/tapestries/${tapestry.id}`)).statusCode).toBe(403)
    expect(
      (
        await asAdmin
          .patch(`/api/items/${items[0].id}`)
          .send({ type: 'image', title: 'Edited by admin' })
      ).statusCode,
    ).toBe(403)
  })

  test('private tapestries are hidden from admins unless they own or were invited to them', async () => {
    const { tapestry: hidden } = await privateTapestry()
    const { tapestry: invited } = await privateTapestry()
    const { tapestry: shared } = await linkTapestry()
    await prisma.tapestryAccess.create({
      data: { tapestryId: invited.id, userId: adminId, canEdit: false },
    })
    const owned = await generate('Tapestry', { ownerId: adminId, visibility: 'private' })
    const asAdmin = loginUser(adminId)

    const list = await asAdmin.get('/api/admin/tapestries?limit=1000')
    expect(list.statusCode).toBe(200)
    const ids = list.body.data.map((t: { id: string }) => t.id)
    expect(ids).not.toContain(hidden.id)
    expect(ids).toEqual(expect.arrayContaining([invited.id, shared.id, owned.id]))

    expect((await asAdmin.get(`/api/admin/tapestries/${hidden.id}`)).statusCode).toBe(403)
    expect((await asAdmin.get(`/api/admin/tapestries/${invited.id}`)).statusCode).toBe(200)
    expect(
      (await asAdmin.patch(`/api/admin/tapestries/${hidden.id}`).send({ featured: false }))
        .statusCode,
    ).toBe(403)
    expect((await asAdmin.delete(`/api/admin/tapestries/${hidden.id}`)).statusCode).toBe(403)
    expect(await prisma.tapestry.count({ where: { id: hidden.id } })).toBe(1)
  })

  test('admin opens of link-shared tapestries are logged, not counted as user activity', async () => {
    const { tapestry } = await linkTapestry()
    const asAdmin = loginUser(adminId)

    expect((await asAdmin.get(`/api/tapestries/${tapestry.id}`)).statusCode).toBe(200)
    expect((await asAdmin.get(`/api/tapestries/${tapestry.id}`)).statusCode).toBe(200)
    const interaction = await asAdmin
      .post('/api/tapestry-interactions')
      .send({ tapestryId: tapestry.id, lastSeen: new Date() })
    expect(interaction.statusCode).toBe(200)

    expect(await prisma.tapestryInteraction.count({ where: { tapestryId: tapestry.id } })).toBe(0)
    // Repeated opens are logged once
    expect(
      await prisma.adminActivity.count({
        where: { action: 'openTapestry', targetId: tapestry.id, adminId },
      }),
    ).toBe(1)
  })
})

describe('featuring', () => {
  test('admins feature link-shared tapestries without changing them', async () => {
    const { tapestry } = await linkTapestry()
    const before = await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestry.id } })

    const response = await loginUser(adminId)
      .patch(`/api/admin/tapestries/${tapestry.id}`)
      .send({ featured: true })
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ featured: true, sharingLevel: 'link' })

    const after = await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestry.id } })
    expect(after.updatedAt).toEqual(before.updatedAt)
    expect(
      await prisma.adminActivity.count({
        where: { action: 'changeFeatured', targetId: tapestry.id },
      }),
    ).toBe(1)

    // The tapestry appears in the public Gallery
    const gallery = await request(app).get('/api/tapestries?filter[featured:eq]=true')
    expect(gallery.body.data.map((t: { id: string }) => t.id)).toContain(tapestry.id)
  })

  test('admins cannot feature restricted tapestries or change sharing', async () => {
    // A private tapestry the admin was invited to, so that it's visible in the admin panel
    const { tapestry } = await privateTapestry()
    await prisma.tapestryAccess.create({
      data: { tapestryId: tapestry.id, userId: adminId, canEdit: false },
    })
    const asAdmin = loginUser(adminId)

    let response = await asAdmin
      .patch(`/api/admin/tapestries/${tapestry.id}`)
      .send({ featured: true })
    expect(response.statusCode).toBe(400)

    response = await asAdmin
      .patch(`/api/admin/tapestries/${tapestry.id}`)
      .send({ sharingLevel: 'link' })
    expect(response.statusCode).toBe(400)

    expect(await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestry.id } })).toMatchObject({
      visibility: 'private',
      featured: false,
    })
  })

  test('restricting a featured tapestry removes it from the Gallery', async () => {
    const { tapestry, owner } = await linkTapestry()
    await loginUser(adminId).patch(`/api/admin/tapestries/${tapestry.id}`).send({ featured: true })

    await loginUser(owner.id)
      .patch(`/api/tapestries/${tapestry.id}`)
      .send({ visibility: 'private' })
    const dbTapestry = await prisma.tapestry.findUniqueOrThrow({ where: { id: tapestry.id } })
    expect(dbTapestry).toMatchObject({ featured: false, galleryPosition: null })
  })

  test('newly featured tapestries go first and the Gallery is published atomically', async () => {
    const asAdmin = loginUser(adminId)
    const first = (await linkTapestry()).tapestry
    const second = (await linkTapestry()).tapestry
    const third = (await linkTapestry()).tapestry
    for (const t of [first, second, third]) {
      await asAdmin.patch(`/api/admin/tapestries/${t.id}`).send({ featured: true })
    }

    const galleryIds = async () =>
      (
        await prisma.tapestry.findMany({
          where: { featured: true },
          orderBy: { galleryPosition: 'asc' },
        })
      ).map((t) => t.id)

    const ids = await galleryIds()
    expect(ids.indexOf(third.id)).toBeLessThan(ids.indexOf(second.id))
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id))

    // Reorder and remove one tapestry in one step
    const reordered = [...ids].reverse().filter((id) => id !== second.id)
    let response = await asAdmin
      .post('/api/admin/activity')
      .send({ action: 'reorderGallery', tapestryIds: reordered, removedTapestryIds: [second.id] })
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      action: 'reorderGallery',
      adminId,
      targetType: 'gallery',
      details: { tapestryIds: reordered, removedTapestryIds: [second.id] },
    })
    expect(await galleryIds()).toEqual(reordered)
    expect(await prisma.tapestry.findUniqueOrThrow({ where: { id: second.id } })).toMatchObject({
      featured: false,
      visibility: 'link',
    })

    // The lists must cover exactly the featured tapestries, and a failed action changes nothing
    const entriesBefore = await prisma.adminActivity.count({ where: { action: 'reorderGallery' } })
    response = await asAdmin
      .post('/api/admin/activity')
      .send({ action: 'reorderGallery', tapestryIds: reordered.slice(2), removedTapestryIds: [] })
    expect(response.statusCode).toBe(409)
    expect(await galleryIds()).toEqual(reordered)
    expect(await prisma.adminActivity.count({ where: { action: 'reorderGallery' } })).toBe(
      entriesBefore,
    )
  })
})

describe('deletion', () => {
  test('admins delete selected items, including ones used in a presentation', async () => {
    const { tapestry, items } = await linkTapestry()
    const step = await prisma.presentationStep.create({ data: { itemId: items[0].id } })
    await prisma.presentationStep.create({ data: { itemId: items[1].id, prevStepId: step.id } })

    const response = await loginUser(adminId)
      .post('/api/admin/activity')
      .send({ action: 'deleteItems', tapestryId: tapestry.id, itemIds: [items[0].id] })
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({
      action: 'deleteItems',
      targetType: 'tapestry',
      targetId: tapestry.id,
      targetLabel: tapestry.title,
      details: { items: [expect.objectContaining({ id: items[0].id })] },
    })

    expect(await prisma.item.count({ where: { id: items[0].id } })).toBe(0)
    expect(await prisma.item.count({ where: { tapestryId: tapestry.id } })).toBe(items.length - 1)
    expect(
      await prisma.adminActivity.count({ where: { action: 'deleteItems', targetId: tapestry.id } }),
    ).toBe(1)
  })

  test('items of private tapestries cannot be deleted by admins', async () => {
    const { tapestry, items } = await privateTapestry()
    const response = await loginUser(adminId)
      .post('/api/admin/activity')
      .send({ action: 'deleteItems', tapestryId: tapestry.id, itemIds: [items[0].id] })
    expect(response.statusCode).toBe(403)
    expect(await prisma.item.count({ where: { id: items[0].id } })).toBe(1)
  })

  test('items from another tapestry are rejected', async () => {
    const { tapestry } = await linkTapestry()
    const { items: otherItems } = await linkTapestry()
    const response = await loginUser(adminId)
      .post('/api/admin/activity')
      .send({ action: 'deleteItems', tapestryId: tapestry.id, itemIds: [otherItems[0].id] })
    expect(response.statusCode).toBe(400)
    expect(await prisma.item.count({ where: { id: otherItems[0].id } })).toBe(1)
  })

  test('only item deletion and Gallery ordering can be created as activity', async () => {
    const asAdmin = loginUser(adminId)
    for (const body of [
      { action: 'changeRole', targetId: adminId },
      { action: 'openTapestry', tapestryId: crypto.randomUUID() },
      { tapestryIds: [] },
      { action: 'deleteItems', tapestryId: crypto.randomUUID(), itemIds: [] },
    ]) {
      const response = await asAdmin.post('/api/admin/activity').send(body)
      expect(response.statusCode, JSON.stringify(body)).toBe(400)
    }
  })

  test('deleting a tapestry is logged and recorded for reporting', async () => {
    const { tapestry, owner } = await linkTapestry()

    const response = await loginUser(adminId).delete(`/api/admin/tapestries/${tapestry.id}`)
    expect(response.statusCode).toBe(200)

    expect(await prisma.tapestry.count({ where: { id: tapestry.id } })).toBe(0)
    expect(
      await prisma.tapestryDeletion.findFirst({ where: { tapestryId: tapestry.id } }),
    ).toMatchObject({ byAdmin: true, deletedById: adminId, ownerId: owner.id })
    expect(
      await prisma.adminActivity.findFirst({
        where: { action: 'deleteTapestry', targetId: tapestry.id },
      }),
    ).toMatchObject({ targetLabel: tapestry.title })
  })

  test('owner deletions are recorded for reporting', async () => {
    const { tapestry, owner } = await privateTapestry()
    const response = await loginUser(owner.id).delete(`/api/tapestries/${tapestry.id}`)
    expect(response.statusCode).toBe(200)
    expect(
      await prisma.tapestryDeletion.findFirst({ where: { tapestryId: tapestry.id } }),
    ).toMatchObject({ byAdmin: false, deletedById: owner.id })
  })
})

describe('roles', () => {
  test('the last admin cannot remove their own admin role', async () => {
    await prisma.user.updateMany({
      where: { role: 'admin', id: { not: adminId } },
      data: { role: 'user' },
    })

    let response = await loginUser(adminId)
      .patch(`/api/admin/users/${adminId}`)
      .send({ role: 'user' })
    expect(response.statusCode).toBe(409)

    const other = await generate('User', { role: 'user' })
    response = await loginUser(adminId)
      .patch(`/api/admin/users/${other.id}`)
      .send({ role: 'admin' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ role: 'admin' })

    // With a second admin, demotion works
    response = await loginUser(other.id)
      .patch(`/api/admin/users/${other.id}`)
      .send({ role: 'user' })
    expect(response.statusCode).toBe(200)
    expect(
      await prisma.adminActivity.count({ where: { action: 'changeRole', targetId: other.id } }),
    ).toBe(2)
  })
})

describe('reports', () => {
  test('every metric can be computed with comparison', async () => {
    const asAdmin = loginUser(adminId)
    const to = new Date()
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    for (const metric of REPORT_METRICS) {
      for (const compare of ['previous', 'lastYear']) {
        const response = await asAdmin
          .post('/api/admin/report-queries')
          .send({ metric, from, to, compare })
        expect(response.statusCode, `${metric} ${compare}`).toBe(200)
        expect(response.body.metric).toBe(metric)
        if (!response.body.isCurrentState) {
          expect(response.body.comparison, metric).not.toBeNull()
        }
      }
    }

    const allTime = await asAdmin
      .post('/api/admin/report-queries')
      .send({ metric: 'M-01', from: null, to, compare: 'previous' })
    expect(allTime.statusCode).toBe(200)
    expect(allTime.body.comparison).toBeNull()
  })

  test('accounts created exclude admins and drill through to the user list', async () => {
    const asAdmin = loginUser(adminId)
    const from = new Date(Date.now() - 60_000)
    const user = await generate('User', {
      role: 'user',
      orcidId: crypto.randomUUID(),
      createdAt: new Date(),
    })
    await generate('User', { role: 'admin', orcidId: crypto.randomUUID(), createdAt: new Date() })

    const { body } = await asAdmin
      .post('/api/admin/report-queries')
      .send({ metric: 'M-01', from, to: new Date(Date.now() + 60_000), compare: 'none' })
    const orcid = body.current.figures.find((f: { key: string }) => f.key === 'orcid')
    expect(orcid.value).toBe(1)

    const drill = await asAdmin.get('/api/admin/users').query({ filter: orcid.drill.filter })
    expect(drill.body.data.map((u: { id: string }) => u.id)).toEqual([user.id])
  })
})
