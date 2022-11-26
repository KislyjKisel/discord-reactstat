const { TextChannel, MessageEmbed, User } = require("discord.js");
const Rate = require("./rate");

class Message {
    /** @type {import("discord.js").Snowflake} */
    id;
    /** @type {{ tag: string, ico: string }} */
    author;
    /** @type {Rate} */
    rate;
    /** @type {Date} */
    date;
    /** @type {string} */
    content;
    /** @type {string[]} */
    attachments;
    /** @type {Date} */
    gtime;
    /** @type {string} */
    url;

    /**
     * @param {{
     *   id: import("discord.js").Snowflake,
     *   author: { tag: string, ico: string },
     *   rate: Rate, date: Date, content: string,
     *   attachments: string[], gtime: Date, url: string,
     * }} msg
     */
    constructor(msg) {
        this.id = msg.id;
        this.author = msg.author;
        this.rate = msg.rate;
        this.date = msg.date;
        this.content = msg.content;
        this.attachments = msg.attachments;
        this.gtime = msg.gtime;
        this.url = msg.url;
    }

    /**
     * @param {string} userTag 
     * @returns {number | null}
     */
    userScore(userTag) {
        return this.rate.user(userTag);
    }

    skipped() {
        return this.rate.skip;
    }

    /**
     * @returns {number}
     */
    averageScore() {
        return this.rate.avg()
    }

    /**
     * @param {User} [jury]
     * @returns {number}
     */
    score(jury) {
        if(jury == null) return this.averageScore();
        return this.userScore(jury.tag);
    }

    /**
     * @param {TextChannel} channel
     * @param {string} text
     * @param {(embeds: MessageEmbed[]) => MessageEmbed[]} [embedsChange]
     */
    async repostShow(channel, text, embedsChange) {
        let embeds = []

        let authorEmbed = new MessageEmbed();
        authorEmbed.setColor(4136281)
        authorEmbed.setAuthor({ name: this.author.tag, iconURL: this.author.ico })
        const citation = this.content.trim().length === 0 ? '' : `"${this.content}"\n`;
        let descr = `${citation}**[link](${this.url})**`
        if(this.attachments.length > 8) { descr += "*Too many pictures in one post, showing only 9.*"; }
        authorEmbed.setDescription(descr)
        embeds.push(authorEmbed)

        for(let i = 0; i < Math.min(this.attachments.length, 9); ++i)
        {
            let embed = new MessageEmbed();
            embed.setColor(4136281)
            embed.setImage(this.attachments[i])
            embeds.push(embed)
        }

        await channel.send({
            content: text,
            embeds: embedsChange == null ? embeds : embedsChange(embeds),
        });
    }

    /**
     * @param {Message[]} messages
     * @returns {[Date, Date]} nulls when given 0 messages
     */
    static timeperiod(messages) {
        let min = null
        let max = null
        for(let i = 0; i < messages.length; ++i) {
            if(max === null || messages[i].date > max) max = messages[i].date;
            if(min === null || messages[i].date < min) min = messages[i].date;
        }
        return [min, max]
    }
}

module.exports = Message;
