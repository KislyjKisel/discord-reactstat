const { CommandInteraction } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const Cache = require('./cache');


const commandsPath = path.join(__dirname, 'commands');

/**
 * @readonly
 * @enum {number}
 */
const OptionType = { string: 0, channel: 1, date: 2, integer: 3, user: 4, boolean: 5, float: 6 };

/**
 * @typedef {{ name: string, type: OptionType, req: boolean, descr: string, choices?: { name: string, value: string | number }[] }} OptionDescr
 */

/**
 * @callback CommandHandler
 * @param {CommandInteraction} interaction
 * @param {Cache} cache
 * @param {any} opts
 * @returns {Promise<void>}
 */

/**
 * @typedef {{ name: string, description: string, options: OptionDescr[], handle: CommandHandler }} Command
 */


module.exports = {
    OptionType,

    iterate(f) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            f(command)
        }
    },
}
