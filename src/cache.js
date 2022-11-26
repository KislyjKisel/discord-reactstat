const Message = require("./message.js");

/**
 * @typedef {{ name: string, messages: Message[] }} ChannelDescr
 */

/**
 * @typedef {{ [key: import("discord.js").Snowflake]: ChannelDescr }} ChannelMap
 */

/**
 * @callback RecordConflictResolver
 * @param  {Message} oldm old message
 * @param  {Message} newm new message
 */

/**
 * @typedef {{ channels: ChannelMap }} CacheData
 */

/**
 * @typedef {{ value?: number, skip?: boolean, ignore_user?: string }} ReactionCfg
 */

/**
 * @typedef {{
 *   data_dir: string,
 *   reaction_map: {[key: string]: ReactionCfg},
 * }} Config
 */

/**
 * @param {CacheData} data
 * @param {string} chid
 * @param {string} chname
 * @param {Message} msg
 * @param {RecordConflictResolver} [conflict]
 */
function addMsgToData(data, chid, chname, msg, conflict) {
    if(!(chid in data.channels)) {
        data.channels[chid] = { name: chname, messages: [ msg ] }
        return;
    }

    for(let i = 0; i < data.channels[chid].messages.length; ++i) {
        if(data.channels[chid].messages[i].id == msg.id) {
            data.channels[chid].messages[i] =
                conflict == null
                    ? msg
                    : conflict(data.channels[chid].messages[i], msg);
            return;
        }
    }
    data.channels[chid].messages.push(msg)
    return;
}

class Cache {
    /**
     * @param {Config} cfg
     * @param {import('./rw.js')} rw
     */

    constructor(rw, cfg){
        /** @type {CacheData} */
        this.data = { channels: {} }
        /** @type {import('./rw.js')} */
        this.rw = rw;
        /** @type {{[key: string]: ReactionCfg}} */
        this.reaction_map = cfg.reaction_map;
    }

    /**
     * Clear storage.
     */
    clear() {
        this.data.channels = {}
    }

    /**
     * Remove from storage messages satisfying a predicate.
     * @param {any} chid Channel id
     * @param {(msg: Message) => boolean} pred Predicate
     * @returns {number} Removed messages count
     */
    removeIf(chid, pred) {
        let count = 0;
        if(!(chid in this.data.channels)) return 0;
        for(let i = 0; i < this.data.channels[chid].messages.length; ++i) {
            if(pred(this.data.channels[chid].messages[i])) {
                this.data.channels[chid].messages.splice(i, 1);
                --i;
                count++;
            }
        }
        return count;
    }

    /**
     * Add message to storage
     * @param {any} chid Message's channel id
     * @param {string} chname Message's channel name
     * @param {Message} msg Message
     * @param {RecordConflictResolver} [conflict]
     *     Callback to be used when the message is already in storage.
     *     Replaces old message by default.
     */
    record(chid, chname, msg, conflict) {
        addMsgToData(this.data, chid, chname, msg, conflict)
    }

    /**
     * @param {ChannelMap} data_channels
     * @param {RecordConflictResolver} conflict
     */
    recordMany(data_channels, conflict) {
        let countperchname = {}
        Object.entries(data_channels).forEach(([chid, ch]) => {
            let count = 0
            ch.messages.forEach(msg => {
                count++
                this.record(chid, ch.name, msg, conflict)
            })
            countperchname[ch.name] = count
        });
        return countperchname;
    }

    /**
     * @param {any} chid
     * @param {(value: Message, index: number, array: Message[]) => boolean} filter
     */
    messagesFilter(chid, filter) {
        return this.messages(chid).filter(filter);
    }

    /**
     * Get all stored messages originating in a specified channel.
     * @param {any} chid Channel id
     */
    messages(chid) {
        if(!(chid in this.data.channels)) return []
        return this.data.channels[chid].messages;
    }

    /**
     * @param {CacheData} d1 First storage
     * @param {CacheData} d2 Second storage
     * @param {RecordConflictResolver} [conflict]
     *     Callback to be used when the same message is found in both storages.
     *     Message data from the second storage is prioritized by default.
     * @returns {CacheData}
     */
    static combineData(d1, d2, conflict) {
        /** @type {CacheData} */
        const d3 = { channels: {} };
        const d1e = Object.entries(d1.channels);
        const d2e = Object.entries(d2.channels);
        for(const [chid, ch] of d1e) {
            for(let i = 0; i < ch.messages.length; ++i) {
                addMsgToData(d3, chid, ch.name, ch.messages[i], conflict);
            }
        }
        for(const [chid, ch] of d2e) {
            for(let i = 0; i < ch.messages.length; ++i) {
                addMsgToData(d3, chid, ch.name, ch.messages[i], conflict);
            }
        }
        return d3;
    }
}

module.exports = Cache;
