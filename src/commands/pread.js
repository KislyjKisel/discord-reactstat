const commands = require('../commands.js');

/**
 * @type {import('../commands.js').Command}
 */
const command = {
    name: "ratings_pread",
    description: "Read saved message data from a permament storage",
    options: [
        { name: "name", type: commands.OptionType.string, req: true, descr: "Entry name" },
        {
            name: "read_over",
            type: commands.OptionType.boolean,
            req: false,
            descr: "By default only older info is updated. Set *true* to overwrite anyway.",
        }
    ],

    /**
     * @param {{ name: string, read_over: boolean }} opts 
     */
    async handle(interaction, cache, opts) {

        const d = await cache.rw.read(opts.name, interaction)
        if(d !== null) {
            let overread = opts.read_over === null ? false : opts.read_over; // probably useless in js
            let countperchname = cache.recordMany(d.channels, overread ? null : ((oldm, newm) => oldm.gtime > newm.gtime ? oldm : newm ))

            let succes_msg = `Read '${opts.name}' entry.`;
            Object.entries(countperchname).forEach(([chname, count]) => {
                succes_msg += `\n${count} messages from channel '${chname}'.`;
            })
            await interaction.reply({
                content: succes_msg,
                ephemeral: false
            })
            setTimeout(() => {
                interaction.deleteReply()
            }, 30000)
        }
    }
}

module.exports = command;
