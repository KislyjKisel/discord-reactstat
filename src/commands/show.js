const { TextChannel, User } = require('discord.js');

const commands = require('../commands.js');
const Message = require('../message.js');
const Pretty = require('../pretty.js')
const Params = require('../param');


const showParams = [
    Params.v.JuryParam,
    Params.v.AuthorParam,
    Params.v.DateParam,
    Params.v.GradeAmountParam,
    Params.v.AverageScoreRangeParam,
    Params.v.IndividualScoreRangeParam,
    Params.v.UnityParam,
    Params.v.SpecialParam,
];

/**
 * @param {TextChannel} channel Where to send to
 * @param {Message[]} messages 
 * @param {{ jury: User | null, count: number, index0: number }} opts 
 */
async function sendMessages(channel, messages, opts) {
    for(let i = opts.index0 - 1; i < opts.index0 - 1 + Math.min(messages.length, opts.count); ++i) {
        const avg_rating = Pretty.showScore(messages[i].averageScore());
        const bottext = (opts.jury === null
            ? (`*Score: ${avg_rating}*`)
            : (`*${opts.jury.username}'s score: ${messages[i].userScore(opts.jury.tag)}, average: ${avg_rating}*`));

        messages[i].repostShow(channel, bottext)
    }
}
/**
 * @type {import('../commands.js').Command}
 */
const command = {
	name: "ratings_show",
	description: "Show ratings for messages posted in specified time period.",
	options: [
		{ name: "channel",   type: commands.OptionType.channel, req: true,  descr: "Channel to use loaded posts from"},
        { name: "count",     type: commands.OptionType.integer, req: true,  descr: "How many posts to show" },
        { name: "method",    type: commands.OptionType.string,  req: false, descr: "Sorting method, defaults to 'best'", choices: [{ name: "best", value: "best" }, { name: "worst", value: "worst" }] },
        { name: "index0",    type: commands.OptionType.integer, req: false, descr: "Show starting from index (defaults to 1)" },
        ...Params.initoptd(showParams)
    ],

    /**
     * @param {{ 
     *   channel: TextChannel,
     *   method: 'best' | 'worst' | null,
     *   count: number, index0: number,
     *   jury: User | null,
     * }} opts
     */
    async handle(interaction, cache, opts) {
        const cmdparams = Params.initcmd(showParams, opts);
        if(opts.method === null) { opts.method = 'best' }
        opts.index0 = (opts.index0 == null || opts.index0 <= 0) ? 1 : opts.index0;

        if(interaction.channel.type != "GUILD_TEXT") {
            interaction.reply({content: "This command can only be used in text channels.", ephemeral: true });
            return;
        }

        await interaction.deferReply();

        let messages = Params.filter(cmdparams, cache.messages(opts.channel));
        if(messages.length == 0) {
            await interaction.editReply({ content: "No loaded messages meet the constraints." });
            return;
        }
        await interaction.editReply({ content: "Filtered " + messages.length + " loaded messages, processing..." })

        messages = Params.sort(cmdparams, messages);
        if(opts.method == "best") {
            await interaction.editReply("Processing complete, sending results...");
            await sendMessages(interaction.channel, messages.reverse(), opts);
        }
        else if(opts.method == "worst") {
            messages.reverse(); 
            await interaction.editReply("Processing complete, sending results...");
            await sendMessages(interaction.channel, messages, opts);
        }

        try {
            await interaction.editReply(`Results:`);
        }
        catch(error) {
            console.error("Edit reply failed: ", error);
        }
    }
}

module.exports = command;
