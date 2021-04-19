import { Context, Telegraf } from 'telegraf'
import { setStart, getStart, deleteInterval } from '../models'
let textToSpeech = require('@google-cloud/text-to-speech')
const tokenPath = './google_api.json';
process.env.GOOGLE_APPLICATION_CREDENTIALS = tokenPath;
const fs = require('fs');
const util = require('util');

export async function toVoice(text: string) {
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();
  const request = {
    input: { text: text },
    // Select the language and SSML voice gender (optional)
    voice: { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-C' },
    // select the type of audio encoding
    audioConfig: { audioEncoding: 'MP3' },
  };

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent
}

export function setupSpeaker(bot: Telegraf<Context>) {
  bot.command(['vs'], async (ctx) => {
    if (ctx.message.reply_to_message) {
      await setStart(ctx.from.id, ctx.message.reply_to_message.message_id)
      ctx.reply("Ok, this is the start", { reply_to_message_id: ctx.message.message_id })
      // ctx.deleteMessage(ctx.message.message_id)
    }
    else {
      ctx.reply("this command sould be used as reply", { reply_to_message_id: ctx.message.message_id })
      return
    }
  })
  //TODO: should skip id's related to this bot
  //TODO: treat case when there are no messages
  bot.command(['ve'], async (ctx) => {
    if (ctx.message.reply_to_message) {
      let start = await getStart(ctx.from.id)
      let end = ctx.message.reply_to_message.message_id
      if (start == -1) {
        ctx.reply("You didn't define the start, use /vs", { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (start >= end) {
        ctx.reply("Start message should be first", { reply_to_message_id: ctx.message.message_id })
        return
      }
      let max_msg = 50
      await deleteInterval(ctx.from.id)
      let i = 0
      let real_messages = 0
      let messages = []
      console.log(start, end)
      for (i = start; i <= end; ++i) {
        try {
          let m = await ctx.reply(".", { reply_to_message_id: i })
          if ('text' in m.reply_to_message) {
            if (!m.reply_to_message.from.is_bot) {
              real_messages += 1

              let user_name = ''
              // m.reply_to_message.from.
              if (m.reply_to_message.from.first_name || m.reply_to_message.from.last_name) {
                console.log(m.reply_to_message.from.first_name)
                console.log(m.reply_to_message.from.last_name)
                user_name = m.reply_to_message.from.first_name + m.reply_to_message.from.last_name
              }
              else {
                user_name = m.reply_to_message.from.username
              }
              messages.push('От ' + user_name + ': ' + m.reply_to_message.text)
            }
          }
          ctx.deleteMessage(m.message_id)
          if (real_messages > max_msg) {
            break
          }
        } catch (err) {
          console.log(err)
        }
      }
      let all_messages = messages.join('.\n') + '.'
      // ctx.reply(messages.join('.\n'), { reply_to_message_id: ctx.message.message_id })
      let audio = await toVoice(all_messages)
      ctx.replyWithVoice({ source: audio }, { reply_to_message_id: ctx.message.message_id })
      // ctx.deleteMessage(ctx.message.message_id)
    }
    else {
      ctx.reply("this command sould be used as reply", { reply_to_message_id: ctx.message.message_id })
      return
    }
  })
  bot.command(['voice'], async (ctx) => {
    if (ctx.message.reply_to_message && 'text' in ctx.message.reply_to_message) {
      let all_messages = ctx.message.reply_to_message.text
      
      let user_name = ''
      // m.reply_to_message.from.
      if (ctx.message.reply_to_message.from.first_name || ctx.message.reply_to_message.from.last_name) {
       
        user_name = ctx.message.reply_to_message.from.first_name + ctx.message.reply_to_message.from.last_name
      }
      else {
        user_name = ctx.message.reply_to_message.from.username
      }
      all_messages = 'От ' + user_name + ': ' + all_messages
      // ctx.reply(messages.join('.\n'), { reply_to_message_id: ctx.message.message_id })
      let audio = await toVoice(all_messages)
      ctx.replyWithVoice({ source: audio }, { reply_to_message_id: ctx.message.message_id })
      // ctx.deleteMessage(ctx.message.message_id)
    }
    else {
      ctx.reply("this command sould be used as reply", { reply_to_message_id: ctx.message.message_id })
      return
    }
  })
}
