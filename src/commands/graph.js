const { User, GuildChannel } = require('discord.js');

const commands = require('../commands.js');
const Message = require('../message.js');
const Pretty = require('../pretty.js');
const Params = require('../param');


const graphParams = [
    Params.v.JuryParam,
    Params.v.AuthorParam,
    Params.v.DateParam,
    Params.v.GradeAmountParam,
    Params.v.AverageScoreRangeParam,
    Params.v.IndividualScoreRangeParam,
    Params.v.SpecialParam,
];

/**
 * @typedef {{
 *   channel: GuildChannel,
 *   count: number,
 *   param: 'average_rating' | 'count' | null,
 *   time_unit: 'month' | 'day' | 'week' | null,
 *   date0: Date | null, date1: Date | null,
 *   jury: User | null,
 *   author: User | null,
 *   mingrades: number | null,
 *   barwidth: number | null,
 * }} GraphOpts
 */

/**
 * @param {{ max: number, width: number }} opts
 * @param {number} value 
 */
function plotline(opts, value) {
    let unit = opts.max / opts.width;
    let line = '';
    let width = 0
    for(let i = 0; i < value; i += unit) {
        line += '█'; // todo: char as cmd param
        width++;
    }
    for(; width < opts.width; width++) {
        line += '--';
    }
    return line;
}

/**
 * @param {GraphOpts} opts
 * @returns {[Date, Date]}
 */
function timeinit(opts) {
    let date0 = new Date(opts.date0.getFullYear(), opts.date0.getMonth(), opts.date0.getDate());
    let date1 = null;
    switch(opts.time_unit) {
        case 'day':
            date1 = new Date(date0.getFullYear(), date0.getMonth(), date0.getDate() + 1);
            break;

        case 'week':
            date1 = new Date(date0.getFullYear(), date0.getMonth(), date0.getDate() + 7);
            break;

        case 'month':
            date1 = new Date(date0.getFullYear(), date0.getMonth() + 1, 1);
            break;
    }
    return [date0, date1];
}

/**
 * @param {GraphOpts} opts
 * @returns {[Date, Date]}
 */
function timestep(opts, [d0, d1]) {
    let d2 = null;
    switch(opts.time_unit) {
        case 'day':
            d2 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate() + 1);
            break;

        case 'week':
            d2 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate() + 7);
            break;

        case 'month': 
            d2 = new Date(d1.getFullYear(), d1.getMonth() + 1, 1);
            break;
    }
    return [d1, d2];
}

/**
 * @param {GraphOpts} opts
 * @param {Message[]} messages
 * @returns {{ m: Message[], t: [Date, Date] }[]}
 */
function splitMessages(opts, messages) {
    messages.sort((x, y) => x.date.getTime() - y.date.getTime());
    const res = []
    let timeunit = timeinit(opts);
    let msgidx = 0
    while(true) {
        const msgs = []
        while(msgidx < messages.length) {
            const msg = messages[msgidx++]
            if(msg.date > timeunit[1]) { msgidx--; break; }
            msgs.push(msg);
        }
        res.push({ m: msgs, t: timeunit });
        if(msgidx >= messages.length) break;
        timeunit = timestep(opts, timeunit);
    }
    return res;
}

/**
 * @param {GraphOpts} opts
 * @param {{ m: Message[], t: [Date, Date] }[]} groups
 * @returns {any}
 */
function unitInitMeta(opts, groups) {
    switch(opts.param) {
        case 'average_rating': return {};
        case 'count': {
            let max_count = 10;
            for(let gi = 0; gi < groups.length; ++gi) {
                if(groups[gi].m.length + 20 > max_count) {
                    max_count = groups[gi].m.length + 20;
                }
            }
            return { max_count };
        }
    }
}

/**
 * @param {GraphOpts} opts 
 * @param {any} meta
 * @returns {any}
 */
function unitInit(opts, meta) {
    switch(opts.param) {
        case 'average_rating': return { sum: 0, count: 0 };
        case 'count': return { count: 0, max_count: meta.max_count };
    }
}

/**
 * @param {GraphOpts} opts
 * @param {Message} msg
 */
function unitConsume(opts, store, msg) {
    switch(opts.param) {
        case 'average_rating': {
            store.sum += opts.jury == null ? msg.averageScore() : msg.userScore(opts.jury.tag);
            store.count += 1;
            break;
        }
        case 'count': {
            store.count += 1;
            break;
        }
    }
}

/**
 * @param {GraphOpts} opts
 * @param {[Date, Date]} period
 */
function unitFinalize(opts, store, period) { // todo: bar width as cmd param
    switch(opts.param) {
        case 'average_rating': {
            const avg_score = store.count === 0 ? 0 : (store.sum / store.count);
            return plotline({ max: 10, width: opts.barwidth }, avg_score) +
                Pretty.appendPeriod(`  **${Pretty.showScore(avg_score)}** `, period[0], period[1], false) + '\n';
        }
        case 'count': {
            return plotline({ max: store.max_count, width: opts.barwidth }, store.count) +
                Pretty.appendPeriod(`  **${Pretty.showScore(store.count)}** `, period[0], period[1], false) + '\n';
        }
    }
}

/** @type {import('../commands.js').Command} */
const command = {
	name: "ratings_graph",
	description: "Show posts with similar grades.",
	options: [
        { name: "channel",   type: commands.OptionType.channel, req: true,  descr: "Channel to use loaded posts from"},
        { name: "param",     type: commands.OptionType.string,  req: false, descr: "Parameter to graph (defaults to average rating)", choices: [{ name: "Average rating", value: "average_rating" }, {name: "Message count", value: "count"}] },
		{ name: "time_unit", type: commands.OptionType.string,  req: false, descr: "Length of a time period represented by single line (defaults to 'month')", choices: [{ name: "day", value: "day" }, { name: "month", value: "month" }, { name: "week", value: "week" }] },
        { name: "barwidth",  type: commands.OptionType.integer, req: false, descr: "Width of bars (defaults to 30)" },
		...Params.initoptd(graphParams)
    ],

    /**
     * @param {GraphOpts} opts
     */
    async handle(interaction, cache, opts) {
        const cmdparams = Params.initcmd(graphParams, opts);

        if(opts.param === null) { opts.param = 'average_rating'; }
        if(opts.time_unit === null) { opts.time_unit = 'month'; }
        if(opts.barwidth === null) { opts.barwidth = 30; }
        if(opts.barwidth < 4) { opts.barwidth = 4; }
        if(opts.barwidth > 60) { opts.barwidth = 60; }

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

        if(opts.date0 === null || opts.date1 === null) {
            const [min, max] = Message.timeperiod(messages);
            opts.date0 = opts.date0 === null ? min : opts.date0;
            opts.date1 = opts.date1 === null ? max : opts.date1;
        }

        let groups = splitMessages(opts, messages);
        const unitMeta = unitInitMeta(opts, groups);
        const lines = []
        for(let gi = 0; gi < groups.length; ++gi) {
            const store = unitInit(opts, unitMeta)
            for(let mi = 0; mi < groups[gi].m.length; ++mi) {
                unitConsume(opts, store, groups[gi].m[mi]);
            }
            const line = unitFinalize(opts, store, groups[gi].t);
            if(line != null) { lines.push(line); }
        }

        if(lines.length == 0) {
            await interaction.editReply("Nothing to graph.");
            return;
        }

        const max_chars = 2000;
        let pages = 10
        let msg = Pretty.appendPeriod(`Graph '${opts.param}' per '${opts.time_unit}'`, opts.date0, opts.date1) + '\n'
        let chars_left = max_chars - msg.length;
        for(let i = 0; i < lines.length; ++i) {
            chars_left -= lines[i].length;
            if(chars_left < 0) {
                if(pages <= 0) {
                    break;
                }
                --pages;
                chars_left = max_chars;
                await interaction.channel.send(msg);
                msg = '';
                i--;
            }
            else {
                msg += lines[i];
            }
        }

        await interaction.editReply(msg);
    }
}

module.exports = command;
