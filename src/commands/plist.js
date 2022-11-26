/** @type {import('../commands.js').Command} */
const command = {
	name: "ratings_plist",
	description: "List all entries in the permament storage",
	options: [],
    async handle(interaction, cache, opts) {
        let content = 'Listing all permament storage entries:'
        for(let i = 0; i < cache.rw.entry_paths.length; ++i) {
            const entry = cache.rw.entry_paths[i];
            content += '\n' + entry.name
        }
        await interaction.reply({ content, ephemeral: true });
    }
}

module.exports = command;
