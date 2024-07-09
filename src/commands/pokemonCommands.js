import fetch from 'node-fetch';
import { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// fetching Pokemon based on the name provided
async function catchPokemon(name) {
    const url = `https://api.pokemontcg.io/v2/cards?q=name:${name}`;
    const response = await fetch(url);

    // check if nothing wrong with response
    if (!response.ok) {
        throw new Error('GET request failed!');
    }

    // check if everything is right and returnes json data from response 
    const data = await response.json();
    return data;
}

// function to create embed for Pokemon card info
function createPokemonEmbed(card, maxLevel) {
    return new EmbedBuilder()
        .setTitle(`${card.name}`)
        .setDescription(`HP - ${card.hp}, Max level - ${maxLevel || 'N/A'}`)
        .setTimestamp()
        .setImage(card.images.large);
}
// function to create EVOLVE button
function createEvolveButton(card) {
    const evolveButton = new ButtonBuilder()
        .setCustomId(`evolve-${card.evolvesTo ? card.evolvesTo[0] : 'none'}`)
        .setLabel('Evolve')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
        .addComponents(evolveButton);

    return [row];
}

// function to evolve Pokemon when EVOLVE button is clicked
async function handleEvolve(interaction, pokemonName) {
    try {
        // fetch data for evolved Pokemon using provided name
        const json = await catchPokemon(pokemonName);

        // check if response contains Pokemon data
        if (json.data && json.data.length > 0) {
            const evolvedCard = json.data[0];
            const evolvedEmbed = createPokemonEmbed(evolvedCard);
            const components = createEvolveButton(evolvedCard);

            //if evolution IS possible update message with new evolved Pokemon card 
            await interaction.update({
                content: `Your Pokémon has evolved to ${evolvedCard.name}!`,
                embeds: [evolvedEmbed],
                components: components,
                ephemeral: true
            });
        } else {
            // if evolution is NOT possible update message with info that Pokemon cannot evolve further
            await interaction.update({
                content: `This Pokemon cannot evolve further.`,
                components: [],
                ephemeral: true
            });
        }

        // catch occurring errors
    } catch (error) {
        console.error('Error during evolution:', error);
        await interaction.update({
            content: 'Failed to fetch evolved Pokémon data. Please try again later.',
            components: [],
            ephemeral: true
        });
    }
}

// Commands for bot
const pokemonCommands = [{
    name: 'pokemon',
    description: 'Helps user to find Pokémon card based on Pokémon name',
    options: [{
        name: 'name',
        description: 'Enter Pokémon name',
        required: true,
        type: ApplicationCommandOptionType.String
    }],

    // get Pokemon name 
    action: async function (interaction, options) {
        const name = interaction.options.getString('name');

        // response that will be in discord while searching for right data
        await interaction.reply({
            content: 'Searching for Pokemon...',
            ephemeral: true
        });

        try {
            // fetch Pokemon data
            const json = await catchPokemon(name);

            // check for Pokemon data in response
            if (json.data && json.data.length > 0) {
                const card = json.data[0];
                const maxLevel = json.data.reduce((max, card) => Math.max(max, Number(card.level || 0)), 0);
                const embedCard = createPokemonEmbed(card, maxLevel);
                const components = createEvolveButton(card);

                // if Pokemon was found -> update message with Pokemon card and button
                await interaction.editReply({
                    content: '',
                    ephemeral: true,
                    embeds: [embedCard],
                    components: components
                });

            } else {
                // create empty card
                const emptyCard = new EmbedBuilder()
                    .setTitle('Not found')
                    .setDescription('No Pokémon card found with that name.')
                    .setTimestamp()
                    .setImage('https://i.pinimg.com/originals/7e/48/a9/7e48a9c47f2380fe858daba033559b08.png');

                // update message with empty card
                await interaction.editReply({
                    content: '',
                    ephemeral: true,
                    embeds: [emptyCard]
                });
            }


        } catch (error) {
            //catch errors and update mesage with error message
            console.error('Error during fetch:', error);
            await interaction.editReply({
                content: 'Failed to fetch Pokémon data. Please try again later.',
                ephemeral: true
            });
        }
    }
}];

export { pokemonCommands, handleEvolve };
