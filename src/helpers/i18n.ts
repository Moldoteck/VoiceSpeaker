import I18N from 'telegraf-i18n'
let Telegraf = require('telegraf')

const dirtyI18N = require('telegraf-i18n')

const i18n = new dirtyI18N({
  directory: `${__dirname}/../../locales`,
  defaultLanguage: 'ro',
  sessionName: 'session',
  useSession: false,
  allowMissing: false,
}) as I18N

export function setupI18N(bot: typeof Telegraf) {
  bot.use(i18n.middleware())
  bot.use((ctx, next) => {
    const anyI18N = ctx.i18n as any
    anyI18N.locale(ctx.dbchat.language)
    next()
  })
}
