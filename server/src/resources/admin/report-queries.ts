import { Resources } from 'tapestry-shared/src/data-transfer/resources/index.js'
import { RESTResourceImpl } from '../base-resource.js'
import { adminOnly } from '../../auth/roles.js'
import { BadRequestError } from '../../errors/index.js'
import { runReport } from '../../services/reports.js'

export const adminReportQueries: RESTResourceImpl<Resources['adminReportQueries'], never> = {
  accessPolicy: {
    canCreate: adminOnly,
  },

  handlers: {
    create: async ({ body: { metric, from, to, compare, includeAdmins = false } }) => {
      if (from && from >= to) {
        throw new BadRequestError('The start of the range must be before its end')
      }
      return runReport(metric, { from, to }, compare, includeAdmins)
    },
  },
}
