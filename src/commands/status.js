const Message = require('../message.js');
const Pretty = require('../pretty.js')


/**
 * @type {import('../commands.js').Command}
 */
const command = {
	name: "ratings_status",
	description: "Overview of current bot's state",
	options: [],
    /**
     * @param {{}} opts
     */
    async handle(interaction, cache, opts) {
        let msg = ''
        Object.entries(cache.data.channels).forEach(([_, { name, messages }]) => {
            const [min, max] = Message.timeperiod(messages);
            msg += "Channel '" + name + "' has " + messages.length + " messages loaded";
            msg = Pretty.appendPeriod(msg, min, max);
            msg += '.';
        })
        await interaction.reply({ content: msg ? msg : "Nothing is loaded.", ephemeral: true });
    }
}

module.exports = command;
