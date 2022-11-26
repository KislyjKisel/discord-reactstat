const { TextChannel } = require('discord.js');

const commands = require('../commands.js');


/**
 * @typedef {{
 *   name: string,
 *   date0: Date | null, date1: Date | null,
 *   channel: TextChannel,
 *   method: "new" | "overwrite" | "update",
 * }} WriteOpts
 */

/**
 * @type {import('../commands.js').Command}
 */
const command = {
    name: "ratings_pwrite",
    description: "Write gathered message data to a permament storage",
    options: [
        { name: "name", type: commands.OptionType.string, req: true, descr: "Entry name" },
        {
            name: "method",
            type: commands.OptionType.string,
            req: true,
            descr: "nya",
            choices: [
                { name: "Create new entry", value: "new" },
                { name: "Overwrite existing entry", value: "overwrite" },
                { name: "Update existring entry", value: "update" },
            ]
        },
        { name: "date0", type: commands.OptionType.date, req: false, descr: "Time period start" },
        { name: "date1", type: commands.OptionType.date, req: false, descr: "Time period end" },
        {
            name: "channel",
            type: commands.OptionType.channel,
            req: false,
            descr: "Only from specified channel (beta)"
        },
    ],

    /**
     * @param {WriteOpts} opts 
     */
    async handle(interaction, cache, opts) {
        await cache.rw.write(opts, cache.data, interaction);
    }
}

module.exports = command;
