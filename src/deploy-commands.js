const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const { token } = require('../secret.json');
const Config = require('../config.json') 
const commands = require('./commands.js');


console.log("Deploying commands");

const commandDescriptions = []
commands.iterate(cmd => {
    console.log("Registering command " + cmd.name + (cmd.options.length > 0 ? ', args:' : ''))
    let commandBuilder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

    for(let i = 0; i < cmd.options.length; ++i) {
        const opt = cmd.options[i]

        function optionHandler(b) {
            b.setName(opt.name)
                .setDescription(opt.descr)
                .setRequired(opt.req);

            if("choices" in opt) {
                b.setChoices(...opt.choices);
            }

            return b;
        }

        let opttypename = ''
        switch (opt.type) {
            case commands.OptionType.string:
            case commands.OptionType.date:
                opttypename = 'string'
                commandBuilder.addStringOption(optionHandler);
                break;

            case commands.OptionType.integer:
                opttypename = 'integer'
                commandBuilder.addIntegerOption(optionHandler);
                break;

            case commands.OptionType.boolean:
                opttypename = 'boolean'
                commandBuilder.addBooleanOption(optionHandler);
                break;

            case commands.OptionType.float:
                opttypename = 'float'
                commandBuilder.addNumberOption(optionHandler);
                break;

            case commands.OptionType.channel:
                opttypename = 'channel'
                commandBuilder.addChannelOption(optionHandler);
                break;

            case commands.OptionType.user:
                opttypename = 'user'
                commandBuilder.addUserOption(optionHandler);
                break;

            default:
                throw new Error("Unknown opt type: " + opt.type)
        }
        console.log("* " + opt.name + " : " + opttypename)
    }

    commandDescriptions.push(commandBuilder.toJSON())
})

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(Config.client_id, Config.guild_id), { body: commandDescriptions })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
