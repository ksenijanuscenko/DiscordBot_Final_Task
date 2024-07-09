import fetch from 'node-fetch';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const passwordCommands = [{
    name: 'password',
    description: 'Generate a password',
    options: [{
        name: 'length',
        description: 'Choose the length of password, it must be not less than 6 symbols',
        required: true,
        type: ApplicationCommandOptionType.Integer
    }, {
        name: 'upper',
        description: 'Do you want to include upper case characters?',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'yes',
            value: '1'
        }, {
            name: 'no',
            value: '0'
        }]
    }, {
        name: 'lower',
        description: 'Do you want to include lower case characters?',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'yes',
            value: '1'
        }, {
            name: 'no',
            value: '0'
        }]
    }, {
        name: 'numbers',
        description: 'Do you want to include numbers?',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'yes',
            value: '1'
        }, {
            name: 'no',
            value: '0'
        }]
    }, {
        name: 'special',
        description: 'Do you want to include special characters?',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'yes',
            value: '1'
        }, {
            name: 'no',
            value: '0'
        }]
    }],
    action: async function (interaction) {
        await handleInitialPassword(interaction);
    }
}];

// store last used parameters
let lastPasswordParams = {};

// Function to create button for new password creation
function createNewPasswordButton() {
    const newPasswordButton = new ButtonBuilder()
        .setCustomId('refresh_password')
        .setLabel('Re-generate')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(newPasswordButton);

    return [row];
}

// Function to handle primary password generation
async function handleInitialPassword(interaction) {
    const length = interaction.options.getInteger('length');
    const upper = interaction.options.getString('upper') === '1';
    const lower = interaction.options.getString('lower') === '1';
    const numbers = interaction.options.getString('numbers') === '1';
    const special = interaction.options.getString('special') === '1';


    // save paramentres used to create password and reate new password with these paramentres
    lastPasswordParams = { length, upper, lower, numbers, special };
    await generatePassword(interaction, lastPasswordParams, true);
}

// Function to handle password re-generation
async function handlePasswordRefresh(interaction) {
    if (lastPasswordParams.length) {
        await generatePassword(interaction, lastPasswordParams, false);
    } else {
        await interaction.reply({
            content: 'No previous password parameters found. Please use the command first.',
            ephemeral: true
        });
    }
}

// Function to generate password and send response
async function generatePassword(interaction, params, isPrimary) {
    try {
        const { length, upper, lower, numbers, special } = lastPasswordParams;
        let url = `https://www.psswrd.net/api/v1/password/?length=${length}&upper=${upper ? 1 : 0}&lower=${lower ? 1 : 0}&numbers=${numbers ? 1 : 0}&special=${special ? 1 : 0}`;

        // Check if the response is successful
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API returned an error: ${response.statusText}`);
        }
        const json = await response.json();

        // Check if data is present in the response
        if (!json || !json.password) {
            throw new Error('No password returned from the API');
        }

        const password = json.password;
        const components = createNewPasswordButton();

        // provide response
        if (isPrimary) {
            // Primary command response
            await interaction.reply({
                content: `Generated Password: \n${password}`,
                components: components,
                ephemeral: true
            });
        } else {
            // Button interaction response
            await interaction.update({
                content: `Re-generated Password: \n${password}`,
                components: components
            });
        }
    } catch (error) {
        console.error('Error fetching password:', error);
        await interaction.reply({
            content: 'There was an error generating the password. Please try again.',
            ephemeral: true
        });
    }
}

export { passwordCommands, handlePasswordRefresh };
