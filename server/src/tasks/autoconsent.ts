import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Page } from 'puppeteer'
import { pageEval } from './utils'
import {
  BackgroundMessage,
  Config,
  ContentScriptMessage,
  RuleBundle,
} from '@duckduckgo/autoconsent'

export class AutoconsentError extends Error {}

export const autoconsentScript = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.resolve('@duckduckgo/autoconsent'))),
    'autoconsent.playwright.js',
  ),
  'utf8',
)

// Load the rule bundles shipped with the package
const rules = JSON.parse(
  readFileSync(
    fileURLToPath(import.meta.resolve('@duckduckgo/autoconsent/rules/rules.json')),
    'utf8',
  ),
) as RuleBundle

// See https://github.com/duckduckgo/autoconsent/blob/main/docs/api.md
const autoconsentConfig: Partial<Config> = {
  enabled: true,
  autoAction: 'optOut',
  disabledCmps: [],
  enablePrehide: true,
  enableCosmeticRules: true,
  enableGeneratedRules: true,
  detectRetries: 4,
  isMainWorld: false,
  enableHeuristicDetection: true,
  heuristicMode: 'tier2',
  logs: {
    lifecycle: false,
    rulesteps: false,
    detectionsteps: false,
    evals: false,
    errors: true,
    messages: false,
    waits: false,
  },
}

interface AutoconsentWindow {
  autoconsentReceiveMessage?: (msg: BackgroundMessage) => Promise<void>
}

const sendMessage = async (page: Page, message: BackgroundMessage) =>
  pageEval(
    page,
    (window, msg) => (window as AutoconsentWindow).autoconsentReceiveMessage?.(msg),
    message,
  )

export async function attatchAutoconsent(page: Page, timeout: number): Promise<string> {
  return new Promise((res, rej) => {
    let completed = false

    function complete(msg: string, resolve: true): void
    function complete(msg: unknown, resolve: false): void
    function complete(msg: unknown, resolve: boolean) {
      if (completed) {
        return
      }
      completed = true
      if (resolve) {
        res(msg as string)
      } else {
        rej(
          msg instanceof Error
            ? msg
            : new AutoconsentError(typeof msg === 'string' ? msg : 'Unknown error'),
        )
      }
      clearTimeout(t)
    }

    const t = setTimeout(() => {
      complete(`Timed out after ${timeout}ms`, false)
    }, timeout)

    page
      .exposeFunction('autoconsentSendMessage', async (message?: ContentScriptMessage) => {
        if (!message || typeof message !== 'object') return

        switch (message.type) {
          case 'init':
            return sendMessage(page, {
              type: 'initResp',
              config: autoconsentConfig as Config,
              rules,
            })

          case 'eval': {
            const result = await page.evaluate(message.code)
            return sendMessage(page, {
              type: 'evalResp',
              id: message.id,
              result,
            })
          }

          case 'autoconsentDone':
            complete(`Duration: ${message.duration}ms`, true)
            break
          case 'autoconsentError':
            complete(message.details, false)
            break
          case 'report':
            if (message.state.lifecycle === 'nothingDetected') {
              complete('Nothing detected', true)
            }
            break
          default:
            break
        }
      })
      .then(() => page.evaluate(autoconsentScript))
      .catch((e) => complete(e, false))
  })
}
