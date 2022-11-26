const { CommandInteraction, TextChannel, Message } = require('discord.js');

const Cache = require('../cache.js');
const commands = require('../commands.js');
const MessageRec = require('../message.js');
const Pretty = require('../pretty.js');
const Rate = require('../rate.js')


/**
 * @type {import('../commands.js').Command}
 */
const command = {
    name: "ratings_load",
    description: "Load ratings for messages posted in specified time period.",
    options: [
        { name: "channel", type: commands.OptionType.channel, req: true,  descr: "Channel to gather rated posts from"},
        { name: "date0",   type: commands.OptionType.date,    req: false, descr: "Time period start" },
        { name: "date1",   type: commands.OptionType.date,    req: false, descr: "Time period end" },
        { 
            name: "keep_old",
            type: commands.OptionType.boolean,
            req: false,
            descr: "Set to keep already loaded messages loaded previously.",
        }
    ],

    /**
     * @param {CommandInteraction} interaction
     * @param {Cache} cache
     * @param {{ channel: TextChannel, date0: null | Date, date1: null | Date, keep_old: boolean | null }} opts
     */
    async handle(interaction, cache, opts) {
        let msgcount = 0
        let msgremoved = 0
        let last_msg_id = null
        let last_msg_date = null
        let run = true
        console.log("Loading messages on channel " + opts.channel.name + " from\n" + opts.date0 + "\nto\n" + opts.date1 + '\n' )
        await interaction.deferReply();
        await interaction.editReply({
            content: Pretty.appendPeriod("Started loading", opts.date0, opts.date1, true) + '.',
        });
        while(run) {
            // @ts-ignore
            await opts.channel.messages
                .fetch({ limit: 100, before: last_msg_id == null ? undefined : last_msg_id })
                .then(async messagePage => {
                    /** @type {Message[]} */
                    const msgs = []
                    console.log(`\nMessage page size: ${messagePage.size}, last id: ${last_msg_id}, last date: \n${last_msg_date}\n`);
                    messagePage.forEach(msg => msgs.push(msg));
                    for(let mi = 0; mi < msgs.length; ++mi) {
                        const msg = msgs[mi]
                        if(last_msg_id == null || last_msg_date > msg.createdAt) {
                            last_msg_id = msg.id;
                            last_msg_date = msg.createdAt;
                        }
                        if(opts.date0 === null || msg.createdAt >= opts.date0) {
                            if(opts.date1 === null || msg.createdAt <= opts.date1) {
                                const rate = await Rate.new(cache.reaction_map, msg);
                                if(rate.empty()) continue;
                                let attachments = [];
                                msg.attachments.forEach(x => attachments.push(x.attachment));
                                let msgcontent = msg.content;
                                if(attachments.length == 0) {
                                    const msgtt = msg.content.trim();
                                    if(msgtt.match(/(https?:\/\/[^\s]+)/g)) {
                                        attachments.push(msgtt);
                                        msgcontent = '';
                                    }
                                }
                                const msgraw = {
                                    id: msg.id,
                                    author: { tag: msg.author.tag, ico: msg.author.avatarURL() },
                                    date: msg.createdAt,
                                    rate,
                                    content: msgcontent,
                                    attachments,
                                    gtime: new Date(),
                                    url: msg.url,
                                };

                                console.log("M#" + msgcount + '   ', msg.createdAt); // todo: proper status reporting
                                msgcount++;
                                cache.record(opts.channel, opts.channel.name, new MessageRec(msgraw),
                                    opts.keep_old ? ((oldm, newm) => oldm) : undefined
                                );
                            }
                        }
                        else {
                            run = false;
                            break;
                        }
                    }
                    if(messagePage.size < 100) run = false;
                })
        }
        console.log(`Finished loading\n`);

        let result_msg = null;
        let result_msg_content = Pretty.appendPeriod(
            `Loaded ${msgcount} messages` +
                (msgremoved == 0
                    ? ""
                    : `, ${msgremoved} marked as skipped (due to the presence of a special reaction)`
                ),
            opts.date0,
            opts.date1
        ) + '.';

        try {
            result_msg = await interaction.channel.send({
                content: result_msg_content
            });
        }
        catch(error) {
            console.error("Response sending failed: ", error);
            return;
        }
        setTimeout(async () => {
            try {
                await result_msg.delete()
                await interaction.deleteReply()
            }
            catch(error) {
                console.warn("Del after timeout failed: ", error);
                try {
                    await interaction.channel.send(result_msg_content);
                }
                catch(error2) {
                    console.error("And send failed too: ", error2)
                }
            }
        }, 40000)
    },
};

module.exports = command;
