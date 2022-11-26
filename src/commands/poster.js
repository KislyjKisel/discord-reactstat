const { TextChannel, User, MessageEmbed } = require('discord.js');

const commands = require('../commands.js');
const Pretty = require('../pretty.js');
const Params = require('../param');


const posterParams = [
    Params.v.JuryParam,
    Params.v.DateParam,
    Params.v.GradeAmountParam,
    Params.v.SpecialParam,
];

/**
 * @typedef {'best_post' | 'best_total' | 'worst_post' | 'worst_total'} PosterMethod
 * @typedef {{
 *   method: PosterMethod
 *   channel: TextChannel,
 *   count: number,
 *   jury: User,
 * }} PosterOpts
 */

/** @type {(method: PosterMethod) => boolean} */
const need_reverse = (method) => {
    if(method == 'best_post' || method == 'best_total') return true;
    if(method == 'worst_post' || method == 'worst_total') return false;
    throw new Error("Unknown method.")
};

/** @type {import('../commands.js').Command} */
const command = {
	name: "ratings_poster",
	description: "Show info about message posters",
	options: [
        { name: "channel",   type: commands.OptionType.channel, req: true,  descr: "Channel to use loaded posts from"},
        { name: "count",     type: commands.OptionType.integer, req: true,  descr: "How many posts to show" },
		{
            name: "method",
            type: commands.OptionType.string,
            req: true,
            descr: "Filtering and sorting method",
            choices: [
                { name: "best_post", value: "best_post" },
                { name: "worst_post", value: "worst_post" },
                { name: "best_total", value: "best_total" },
                { name: "worst_total", value: "worst_total" }
            ]
        },
		...Params.initoptd(posterParams)
	],
    /**
     * @param {PosterOpts} opts 
     */
    async handle(interaction, cache, opts) {
        const cmdparams = Params.initcmd(posterParams, opts);

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
        if(need_reverse(opts.method)) messages.reverse(); 

        if(opts.method == 'best_post' || opts.method == 'worst_post') {
            let posters = []
            for(let mi = 0; mi < messages.length; mi++) {
                const msg = messages[mi]
                let already_seen = false;
                for(let pi = 0; pi < posters.length; ++pi) {
                    if(posters[pi] == msg.author.tag) { already_seen = true; break;  }
                }
                if(already_seen) {
                    messages.splice(mi, 1);
                    --mi;
                    continue;
                }
                posters.push(msg.author.tag);
            }

            for(let i = 0; i < Math.min(messages.length, opts.count); ++i) {
                const avg_rating = Pretty.showScore(messages[i].averageScore());
                const bottext = (opts.jury === null
                    ? (`*Score: ${avg_rating}*\n`)
                    : (`*${opts.jury.username}'s score: ${messages[i].userScore(opts.jury.tag)}, average: ${avg_rating}.*`)
                );
                messages[i].repostShow(interaction.channel, bottext);
            }

            try {
                await interaction.editReply(`Results:`);
            }
            catch(error) {
                console.error("Edit reply failed: ", error);
            }
            return;
        }

        if(opts.method == 'best_total' || opts.method == 'worst_total') {
            /** @type {{[key: string]: { ico: string, sum: number, count: number }}} */
            let scoretable = {}
            for(let i = 0; i < messages.length; ++i) {
                const msg = messages[i];
                if(!(msg.author.tag in scoretable)) {
                    scoretable[msg.author.tag] = {
                        ico: msg.author.ico,
                        sum: msg.score(opts.jury),
                        count: 1
                    };
                }
                else {
                    scoretable[msg.author.tag].sum += msg.score(opts.jury);
                    scoretable[msg.author.tag].count += 1;
                }
            }
            /** @type {[string, string, number, number][]} */
            let poster_scores = Object.entries(scoretable).map(([tag, {ico, sum, count}]) => {
                return [tag, ico, sum / count, count];
            });
            poster_scores.sort((x, y) => x[2] - y[2]);
            if(need_reverse(opts.method)) poster_scores.reverse();

            for(let i = 0; i < Math.min(poster_scores.length, opts.count); ++i) {
                const [tag, iconURL, avg_rating, count] = poster_scores[i];

                let authorEmbed = new MessageEmbed();
                authorEmbed.setColor(4136281)
                authorEmbed.setAuthor({ name: tag, iconURL });
                authorEmbed.setDescription(`*Score: ${Pretty.showScore(avg_rating)}, post count: ${count}*`);

                await interaction.channel.send({
                    embeds: [authorEmbed]
                });
            }

            try {
                await interaction.editReply(`Results:`);
            }
            catch(error) {
                console.error("Edit reply failed: ", error);
            }
        }
    }
}

module.exports = command;
