/** @type {import('../commands.js').Command} */
const command = {
	name: "ratings_unload",
	description: "Remove all loaded messages",
	options: [],
    async handle(interaction, cache, opts) {
        cache.clear()
        await interaction.reply("Unloaded all messages.");
        setTimeout(() => {
			interaction.deleteReply()
		}, 30000)
    }
}

module.exports = command;
