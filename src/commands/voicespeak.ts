import { Context, Telegraf } from 'telegraf'
import { setStart, getStart, deleteInterval } from '../models'
let textToSpeech = require('@google-cloud/text-to-speech')
const tokenPath = './google_api.json';
process.env.GOOGLE_APPLICATION_CREDENTIALS = tokenPath;
const fs = require('fs');
const util = require('util');
var streams = require('memory-streams');
var SoxCommand = require('sox-audio');

function mergeAudios(audios) {
  var reader = new streams.ReadableStream();
  var writer = new streams.WritableStream();
  audios.forEach(element => {
    if (false && element instanceof streams.ReadableStream) {
      element.pipe(writer)//maybe read function
    }
    else {
      writer.write(element)
    }
  });
  reader.append(writer.toBuffer())
  return reader
}



export async function toVoice(text: string, language = 'ru-RU', gender = 'NEUTRAL', pause = 0) {
  const client = new textToSpeech.TextToSpeechClient();
  const request = {
    input: { ssml: `<speak>${text}<break time=\"${pause}s\"/></speak>` },
    // , name: `${language}-Wavenet-A`
    voice: { languageCode: language, ssmlGender: gender },
    audioConfig: { audioEncoding: 'MP3' },
  };

  let [response] = await client.synthesizeSpeech(request)

  return response.audioContent
}

function isRussian(value: string) {
  const cyrillicPattern = /^\p{Script=Cyrillic}+$/u;
  return cyrillicPattern.test(value)
}

async function voicify(messages, lang) {
  let all_audios = []
  let voice_types = ['MALE', 'FEMALE']
  if (lang == 'ro-RO') {
    voice_types = ['NEUTRAL', 'NEUTRAL']
  }
  let voice_index = 0

  let i = 0
  for (i = 0; i < messages.length; ++i) {
    let element = messages[i]
    if (true) {
      // if (isRussian(element[0])) {
      let mssg = await toVoice(element.join(''), lang, voice_types[voice_index])
      all_audios.push(mssg)
    }
    else {
      let mssg1 = await toVoice(element[0], 'en-US', voice_types[voice_index])
      let mssg2 = await toVoice(element[1], lang, voice_types[voice_index])
      all_audios.push(mssg1)
      all_audios.push(mssg2)
    }
    voice_index = voice_index == 0 ? 1 : 0
  }
  return all_audios
}

export function setupSpeaker(bot: Telegraf<Context>) {
  bot.command(['vs'], async (ctx) => {
    if (ctx.message.reply_to_message) {
      await setStart(ctx.from.id, ctx.message.reply_to_message.message_id)
      // ctx.reply("Ok, this is the start", { reply_to_message_id: ctx.message.message_id })
      // ctx.deleteMessage(ctx.message.message_id)
    }
    else {
      ctx.reply("this command sould be used as reply", { reply_to_message_id: ctx.message.message_id })
      return
    }
  })
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
      let max_msg = ctx.from.id == 180001222 ? 9999 : 50
      await deleteInterval(ctx.from.id)
      let i = 0
      let real_messages = 0
      let messages = []

      let prev_id = 0
      for (i = start; i <= end; ++i) {
        try {
          let msg = await ctx.telegram.forwardMessage(-586743279, ctx.message.chat.id, i, { disable_notification: true })

          if ('forward_from' in msg) {
            if (('text' in msg) && (msg.text[0] != '/') && !msg.forward_from.is_bot) {
              let user_name = ''
              if (msg.forward_from.first_name
                || msg.forward_from.last_name) {
                user_name = msg.forward_from.first_name// + msg.forward_from.last_name
              }
              else {
                user_name = msg.forward_from.username
              }
              real_messages += 1

              if (msg.forward_from.id == prev_id) {
                let pause = 0.6
                messages[messages.length - 1][1] += `.<break time=\"${pause}s\"/> ` + msg.text
              }
              else {
                messages.push([user_name, ` ${ctx.i18n.t('said')}: ` + msg.text])
              }
              prev_id = msg.forward_from.id
            }
          }
          else if ('forward_sender_name' in msg) {
            //hidden user
            if (('text' in msg) && (msg.text[0] != '/')) {
              let user_name = ''
              if (msg.forward_sender_name) {
                user_name = msg.forward_sender_name
              }
              real_messages += 1
              messages.push([user_name, ` ${ctx.i18n.t('said')}: ` + msg.text])
              prev_id = -1
            }
            replyMethodDeprecated()
          }

          ctx.telegram.deleteMessage(-586743279, msg.message_id)
          if (real_messages > max_msg) {
            break
          }
        } catch (err) {
          console.log(err.response)
        }
      }
      let all_audios = await voicify(messages, languages[ctx.i18n.t('name')])
      let audio = mergeAudios(all_audios)

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
      if (ctx.message.reply_to_message.from.first_name
        || ctx.message.reply_to_message.from.last_name) {
        user_name = ctx.message.reply_to_message.from.first_name// + ctx.message.reply_to_message.from.last_name
      }
      else {
        user_name = ctx.message.reply_to_message.from.username
      }

      all_messages = user_name + ` ${ctx.i18n.t('said')}: ` + all_messages
      console.log(languages[ctx.i18n.t('name')])
      let audio = await toVoice(all_messages, languages[ctx.i18n.t('name')], 'NEUTRAL')

      var command = SoxCommand(audio);

      let reader = new streams.ReadableStream()
      let writer = new streams.WritableStream()
      command.output(writer)
        .outputFileType('ogg');
        
      console.log(writer.toBuffer())
      reader.append(writer.toBuffer())

      ctx.replyWithVoice({ source: reader }, { reply_to_message_id: ctx.message.message_id })
      // ctx.deleteMessage(ctx.message.message_id)
    }
    else {
      ctx.reply("this command sould be used as reply", { reply_to_message_id: ctx.message.message_id })
      return
    }
  })
}

let languages = { 'English': 'en-US', 'Русский': 'ru-RU', 'Romana': 'ro-RO' }

function replyMethodDeprecated() {
  // else {
  //   let m = await ctx.reply(".", { reply_to_message_id: i })
  //   if ('text' in m.reply_to_message) {
  //     if (!m.reply_to_message.from.is_bot) {
  //       real_messages += 1

  //       let user_name = ''
  //       // m.reply_to_message.from.
  //       if (m.reply_to_message.from.first_name || m.reply_to_message.from.last_name) {
  //         console.log(m.reply_to_message.from.first_name)
  //         console.log(m.reply_to_message.from.last_name)
  //         user_name = m.reply_to_message.from.first_name + m.reply_to_message.from.last_name
  //       }
  //       else {
  //         user_name = m.reply_to_message.from.username
  //       }
  //       messages.push('От ' + user_name + ': ' + m.reply_to_message.text)
  //     }
  //   }
  //   ctx.deleteMessage(m.message_id)
  //   if (real_messages > max_msg) {
  //     break
  //   }
  // }
}
