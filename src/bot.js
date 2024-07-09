import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { pokemonCommands, handleEvolve } from './commands/pokemonCommands.js';
import recipeCommands from './commands/recipeCommands.js';
import { passwordCommands, handlePasswordRefresh } from './commands/passwordCommands.js';

const token = process.env.DISCORD_BOT_TOKEN;
const botId = process.env.BOT_ID;
const guildId = process.env.GUILD_ID;
const apiKey = process.env.API_KEY;

if (!token || !botId || !guildId || !apiKey) {
    throw new Error('Missing environment variables. Please check your .env file.');
}

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const allCommands = [...pokemonCommands, ...recipeCommands, ...passwordCommands];

const commandsData = allCommands.map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || []
}));

const rest = new REST({ version: '9' }).setToken(token);

const registerCommands = async () => {
    try {
        console.log('Started refreshing application (/) commands');

        // Fetch all existing commands
        const currentCommands = await rest.get(
            Routes.applicationGuildCommands(botId, guildId)
        );

        // Delete all current commands
        for (const command of currentCommands) {
            await rest.delete(Routes.applicationGuildCommand(botId, guildId, command.id));
        }

        // Register new commands
        await rest.put(Routes.applicationCommands(botId, guildId), { body: commandsData });
        console.log('Commands added successfully');

    } catch (error) {
        console.error(error);
    }
};

// Managing event when bot is ready
bot.once('ready', () => {
    console.log(`Logged in as ${bot.user.tag}`);
});

// Managing event for interaction with bot
bot.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;
        const command = allCommands.find(cmd => cmd.name === commandName);
        if (command) {
            await command.action(interaction);
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'refresh_password') {
            // Handle refresh password button
            await handlePasswordRefresh(interaction);
        } else if (interaction.customId.startsWith('evolve-')) {
            const pokemonName = interaction.customId.split('-')[1];
            if (pokemonName !== 'none') {
                await handleEvolve(interaction, pokemonName);
            } else {
                await interaction.reply({
                    content: 'This Pokémon cannot evolve further.',
                    ephemeral: true
                });
            }
        }
    }
});

bot.login(token);

registerCommands();
