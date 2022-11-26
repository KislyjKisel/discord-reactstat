const fs = require('node:fs');
const Path = require('node:path');

const { CommandInteraction } = require('discord.js');

const Cache = require('./cache.js');
const Message = require('./message.js');
const Params = require('./param')
const Rate = require('./rate.js')


const max_entries = 10
const format_version = 5;

const writeParams = [
    Params.v.DateParam,
];

/**
 * @param {import('./commands/pwrite.js').WriteOpts} opts
 * @param {{ channels: import('./cache.js').ChannelMap }} data
 * @returns {{ channels: import('./cache.js').ChannelMap }}
 */
function filterdata(opts, data) {
    const params = Params.initcmd(writeParams, opts);
    /** @type {{ channels: import('./cache.js').ChannelMap }} */
    let filtered_data = { channels: {} }
    let data_chents = Object.entries(data.channels);
    for(const [chid] of data_chents) {
        if(opts.channel !== null && chid != opts.channel.id) continue; // todo: check if works (probly not)
        filtered_data.channels[chid] = { name: data.channels[chid].name, messages: [] };
        for(let i = 0; i < data.channels[chid].messages.length; ++i) {
            const msg = data.channels[chid].messages[i];
            if(!params[0].filter(msg)) continue;
            filtered_data.channels[chid].messages.push(msg);
        }
    }
    return filtered_data;
}

/**
 * @param {CommandInteraction} interaction
 * @param {string} path
 * @returns {Promise<{channels: import('./cache.js').ChannelMap } | null>} 
 */
async function readdata(interaction, path){
    let strdata = fs.readFileSync(path, { encoding: "utf-8" });
    let entry = JSON.parse(strdata);
    if(entry.ver !== format_version) {
        await interaction.reply({ content: "Entry has incompatible data format.", ephemeral: true });
        return null;
    }
    for(const [chid, ch] of Object.entries(entry.data.channels)) {
        for(let mi = 0; mi < entry.data.channels[chid].messages.length; ++mi) {
            const raw = entry.data.channels[chid].messages[mi];
            raw.date = new Date(raw.date);
            raw.gtime = new Date(raw.gtime);
            raw.rate = new Rate(raw.rate);
            entry.data.channels[chid].messages[mi] = new Message(raw);
        }
    }
    return entry.data;
}

/**
 * @param {import('./commands/pwrite.js').WriteOpts} opts 
 * @param {string} path 
 * @param {{ channels: import('./cache.js').ChannelMap }} data 
 */
function overwrite(opts, path, data) {
    const filtered_data = filterdata(opts, data);
    fs.writeFileSync(path, JSON.stringify({ data: filtered_data, "ver": format_version }));
}

function checkname(name) {
    return name.match(/^[a-z0-9_\-]+$/i);
}

class RW {
    dir_path;
    /** @type {{ path: string, mtime: Date, name: string }[]} */
    entry_paths;

    /** @param {string} dir */
    constructor(dir) {
        this.dir_path = Path.join(__dirname, '../', dir);
        if (!fs.existsSync(this.dir_path)) {
            fs.mkdirSync(this.dir_path)
            this.entry_paths = []
        }
        else {
            this.entry_paths = fs.readdirSync(this.dir_path).filter(file => file.endsWith('.json')).map(spath => {
                const path = Path.join(this.dir_path, spath)
                const stats = fs.statSync(path);
                return {
                    path,
                    mtime: stats.mtime,
                    name: Path.parse(path).name
                }
            }).filter(v => checkname(v.name));
        }
    }

    async remove(name, interaction) {
        for(let i = 0; i < this.entry_paths.length; ++i) {
            if(this.entry_paths[i].name == name) {
                fs.rmSync(this.entry_paths[i].path);
                await interaction.reply(`Removed entry ${name}.`);
                return;
            }
        }
        await interaction.reply({ content: `Entry not found.`, ephemeral: true })
    }

    // ! doesnt reply when entry is found, ephemeral when not
    async read(name, interaction) {
        for(let i = 0; i < this.entry_paths.length; ++i) {
            if(this.entry_paths[i].name == name) {
                return readdata(interaction, this.entry_paths[i].path);
            }
        }
        await interaction.reply({ content: "Entry not found.", ephemeral: true });
        return null;
    }

    /**
     * ! Does reply
     * @param {import('./commands/pwrite.js').WriteOpts} opts 
     * @param {{channels: import('./cache.js').ChannelMap }} cachedata 
     * @param {CommandInteraction} interaction
     */
    async write(opts, cachedata, interaction) {
        if(!checkname(opts.name)) {
            await interaction.reply({ content: "Bad entry name.", ephemeral: true });
            return;
        }
        for(let i = 0; i < this.entry_paths.length; ++i) {
            if(this.entry_paths[i].name == opts.name) {
                if(opts.method == "new") {
                    await interaction.reply({ content: `Entry ${opts.name} already exists.`, ephemeral: true });
                    return;
                }
                if(opts.method == "overwrite") {
                    overwrite(opts, this.entry_paths[i].path, cachedata)
                    await interaction.reply({ content: `Overwritten '${opts.name}' entry.`, ephemeral: false });
                }
                else if(opts.method == "update") {
                    const olddata = await readdata(interaction, this.entry_paths[i].path);
                    const newdata = Cache.combineData(olddata, cachedata, (oldm, newm) =>
                        oldm.gtime > newm.gtime ? oldm : newm
                    );
                    overwrite(opts, this.entry_paths[i].path, newdata);
                    await interaction.reply({ content: `Updated '${opts.name}' entry.`, ephemeral: false });
                }

                setTimeout(() => {
                    interaction.deleteReply()
                }, 30000)
                return;
            }
        }
        if(opts.method != "new") {
            await interaction.reply({ content: `Entry not found`, ephemeral: true });
            return;
        }
        if(this.entry_paths.length + 1 > max_entries) {
            await interaction.reply({ content: `Entry count limit reached.`, ephemeral: true });
            return;
        }
        let path = Path.join(this.dir_path, opts.name + '.json')
        this.entry_paths.push({
            path,
            mtime: new Date(),
            name: opts.name,
        });
        overwrite(opts, path, cachedata);
        await interaction.reply({ content: `Written new entry '${opts.name}'.`, ephemeral: false });
        setTimeout(() => {
			interaction.deleteReply()
		}, 30000)
    }
}

module.exports = RW;
