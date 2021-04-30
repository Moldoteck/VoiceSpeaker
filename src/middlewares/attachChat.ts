import { findChat } from '../models'
import { Context } from 'telegraf'

export async function attachChat(ctx: Context, next) {
  const dbchat = await findChat(ctx.chat.id)
  ctx.dbchat = dbchat
  return next()
}
