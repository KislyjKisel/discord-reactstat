const commands = require('../commands.js');

/**
 * @typedef {{ name: string }} RemoveOpts
 */

/**
 * @type {import('../commands.js').Command}
 */
const command = {
    name: "ratings_premove",
    description: "Remove an entry from permament storage",
    options: [
        { name: "name", type: commands.OptionType.string, req: true, descr: "Entry name" },
    ],

    /**
     * @param {RemoveOpts} opts 
     */
    async handle(interaction, cache, opts) {
        await cache.rw.remove(opts.name, interaction);
    }
}

module.exports = command;
