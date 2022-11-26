const { Client, Collection, Intents } = require('discord.js');

const Config = require('../config.json');
const { token } = require('../secret.json');
const Commands = require('./commands.js');
const Cache = require('./cache.js');
const RW = require('./rw');


const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const commands = new Collection();
const cache = new Cache(new RW(Config.data_dir), Config);

Commands.iterate(cmd => {
    commands.set(cmd.name, cmd);
})

client.once('ready', () => {
    console.log('Ready!');
});

let busy = false
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    if(busy) {
        interaction.reply({ content: "I'm busy right now, please try again later.", ephemeral: true });
        return;
    }
    busy = true;
    try {
        let opts = {}
        for(let i = 0; i < command.options.length; ++i) {
            const opt = command.options[i]
            switch (opt.type) {
                case Commands.OptionType.string:
                    opts[opt.name] = interaction.options.getString(opt.name);
                    break;

                case Commands.OptionType.integer:
                    opts[opt.name] = interaction.options.getInteger(opt.name);
                    break;

                case Commands.OptionType.boolean:
                    opts[opt.name] = interaction.options.getBoolean(opt.name);
                    break;

                case Commands.OptionType.float:
                    opts[opt.name] = interaction.options.getNumber(opt.name);
                    break;

                case Commands.OptionType.date: {
                    try {
                        let date = interaction.options.getString(opt.name);
                        opts[opt.name] = date === null ? null : new Date(date);
                    }
                    catch(error) {
                        console.warn("Date option parse error: ", error)
                        interaction.channel.send({ content: "Can't parse date" })
                        return;
                    }
                    break;
                }

                case Commands.OptionType.channel:
                    opts[opt.name] = interaction.options.getChannel(opt.name);
                    break;

                case Commands.OptionType.user:
                    opts[opt.name] = interaction.options.getUser(opt.name);
                    break;

                default:
                    throw new Error("Unknown command option type");
            }
        }
        await command.handle(interaction, cache, opts);
    } catch (error) {
        console.error("Kaboom: ", error);
        await interaction.reply({ content: 'KABOOM!', ephemeral: true });
    } finally {
        busy = false;
    }
});

client.login(token);
