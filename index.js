import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
// utils
import ogg from './utils/ogg.js';
import ai from './utils/ai.js';

const gptBotToken = process.env.HEROKU_BOT_TOKEN;
const INIT_SESSION = { messages: [] };
const bot = new Telegraf(gptBotToken);
bot.use(session());

bot.command('start', async ctx => {
    ctx.session = INIT_SESSION;
    ctx.reply('Вітаю!');
});

bot.command('new', async ctx => {
    ctx.session = INIT_SESSION;
    await ctx.reply('Розпочато нову сессію!');
});

bot.on(message('text'), async ctx => {
    console.info('on text event');
    ctx.session ??= INIT_SESSION;
    // ctx.reply(JSON.stringify(ctx.message.text, null, 2)); // as console.log

    try {
        await ctx.reply(code('Дай но подумать...'));
        ctx.session.messages.push({
            role: ai.roles.USER,
            content: ctx.message.text
        });
        const response = await ai.chat(ctx.session.messages);
        ctx.session.messages.push({
            role: ai.roles.ASSISTENT,
            content: response.content
        });
        ctx.reply(response.content);
    } catch (error) {
        ctx.reply('Text Bot Error: ' + error.message);
    }
});

bot.on(message('voice'), async ctx => {
    console.info('on voice event');
    ctx.session ??= INIT_SESSION;
    // ctx.reply(JSON.stringify(ctx.message.voice, null, 2)); // as console.log

    try {
        await ctx.reply(code('Дай но подумать...'));
        const fileLink = await ctx.telegram.getFileLink(
            ctx.message.voice.file_id
        );
        const userID = String(ctx.message.from.id);
        const oggPath = await ogg.convert(fileLink.href, userID);
        const mp3path = await ogg.toMp3(oggPath, userID);
        const text = await ai.voiceReader(mp3path);
        await ctx.reply(code(`Ваше запитання: ${text}`)); // question
        ctx.session.messages.push({ role: ai.roles.USER, content: text });
        const response = await ai.chat(ctx.session.messages);
        ctx.reply(JSON.stringify(response, null, 2));
        ctx.session.messages.push({
            role: ai.roles.ASSISTENT,
            content: response.content
        });
        await ctx.reply('Відповідь' + response.content);
    } catch (error) {
        await ctx.reply('Voice Bot Error: ' + error.message);
    }
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
