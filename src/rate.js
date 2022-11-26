const { Message } = require("discord.js");


class Rate {
    /** @type { { value: number, user: { tag: string, ico: string } }[] } */
    data;
    /** @type {boolean} */
    skip;

    constructor(rate) {
        this.data = rate == null ? [] : rate.data;
        this.skip = rate == null ? false : rate.skip;
    }

    /**
     * @param {{ [key: string]: import("./cache").ReactionCfg }} reaction_map
     * @param {Message} msg
     * @returns {Promise<Rate>}
     */
    static async new(reaction_map, msg) {
        /** @type {{ [key: string]: { sum: number, count: number, user: { tag: string, ico: string } } }} */
        let userScoreMap = {}
        let skip = false;
        let ignored_users = []
        await Promise.all(msg.reactions.cache.map(async (reaction) => {
            if(!(reaction.emoji.name in reaction_map)) return;
            const reactionCfg = reaction_map[reaction.emoji.name];
            //console.log("!", reactionCfg)
            if(reactionCfg.skip != null && reactionCfg.skip) { skip = true; }
            if(reactionCfg.ignore_user != null) {
                ignored_users.push(reactionCfg.ignore_user);
            }
            let num = reaction_map[reaction.emoji.name].value
            let users = null
            let counter = 10
            while(counter-- > 0) {
                try {
                    users = await reaction.users.fetch()
                }
                catch(error) {
                    if(counter <= 0) { console.error("Fetching user reactions failed:", error) }
                    continue;
                }
                break;
            }
            if(counter <= 0) { return; }

            users.forEach(u => {
                if(u.tag in userScoreMap) {
                    userScoreMap[u.tag].sum += num;
                    userScoreMap[u.tag].count += 1;
                }
                else {
                    userScoreMap[u.tag] = {
                        count: 1,
                        sum: num,
                        user: { tag: u.tag, ico: u.avatarURL() },
                    }
                }
            });
        }))
        if(ignored_users.length > 0) {
            console.warn("IGMNORED", ignored_users);
        }
        for(let i = 0; i < ignored_users.length; ++i) {
            const tag = ignored_users[i];
            if(tag in userScoreMap) {
                delete userScoreMap[tag];
            }
        }
        let rate = new Rate({ data: [], skip })
        let userScores = Object.entries(userScoreMap);
        for(let i = 0; i < userScores.length; ++i) {
            rate.data.push({ value: userScores[i][1].sum / userScores[i][1].count, user: userScores[i][1].user  });
        }
        return rate;
    }

    empty() {
        return this.data.length <= 0;
    }
    count() {
        return this.data.length;
    }

    user(tag) {
        for(let i = 0; i < this.data.length; ++i) {
            if(tag == this.data[i].user.tag) {
                return this.data[i].value;
            }
        }
        return null;
    }

    avg() {
        let sum = 0
        for(let i = 0; i < this.data.length; ++i) {
            sum += this.data[i].value
        }
        return sum / this.data.length
    }
}

module.exports = Rate;
