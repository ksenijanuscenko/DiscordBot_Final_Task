import fetch from 'node-fetch';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';

const recipeCommands = [{
    name: 'recipe',
    description: 'Helps user to find a desired recipe to cook',
    options: [{
        name: 'type',
        description: 'Choose meal type',
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'main_course',
            value: 'main course'
        }, {
            name: 'soup',
            value: 'soup'
        }, {
            name: 'side_dish',
            value: 'side dish'
        }, {
            name: 'snack',
            value: 'snack'
        }, {
            name: 'salad',
            value: 'salad'
        }, {
            name: 'breakfast',
            value: 'breakfast'
        }, {
            name: 'sauce',
            value: 'sauce'
        }, {
            name: 'dessert',
            value: 'dessert'
        }, {
            name: 'drink',
            value: 'drink'
        }]
    }, {
        name: 'cuisine',
        description: 'Choose cuisine type',
        required: false,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: 'italian',
            value: 'italian'
        }, {
            name: 'asian',
            value: 'asian'
        }, {
            name: 'thai',
            value: 'thai'
        }, {
            name: 'mexican',
            value: 'mexican'
        }, {
            name: 'european',
            value: 'european'
        }]
    }, {
        name: 'exclude',
        description: 'Ingredients to exclude (comma-separated)',
        required: false,
        type: ApplicationCommandOptionType.String
    }, {
        name: 'include',
        description: 'Ingredients to include (comma-separated)',
        required: false,
        type: ApplicationCommandOptionType.String
    }, {
        name: 'cooking_time',
        description: 'Maximum cooking time',
        required: false,
        type: ApplicationCommandOptionType.String,
        choices: [{
            name: '15 minutes or less',
            value: '15'
        }, {
            name: '30 minutes or less',
            value: '30'
        }, {
            name: '45 minutes or less',
            value: '45'
        }, {
            name: '1 hour or less',
            value: '60'
        }]
    }],
    action: async function (interaction) {
        const dishType = interaction.options.getString('type');
        const cuisineType = interaction.options.getString('cuisine');
        const excludeIngredients = interaction.options.getString('exclude');
        const includeIngredients = interaction.options.getString('include');
        const maxReadyTime = interaction.options.getString('cooking_time');
        const apiKey = process.env.API_KEY;

        // create URL for the primary search
        let searchUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&type=${dishType}`;
        if (cuisineType) {
            searchUrl += `&cuisine=${cuisineType}`;
        }
        if (excludeIngredients) {
            searchUrl += `&excludeIngredients=${excludeIngredients}`;
        }
        if (includeIngredients) {
            searchUrl += `&includeIngredients=${includeIngredients}`;
        }
        if (maxReadyTime) {
            searchUrl += `&maxReadyTime=${maxReadyTime}`;
        }

        console.log(`Fetching search URL: ${searchUrl}`);


        try {
            // Fetch primary search results
            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) {
                throw new Error(`HTTP error! Status: ${searchResponse.status}`);
            }

            const searchResult = await searchResponse.json();
            console.log('Search JSON Response:', searchResult);

            // check for recipes in search result
            if (!searchResult.results || searchResult.results.length === 0) {
                await interaction.reply({
                    content: 'No recipe found with the given requirements.',
                    ephemeral: true
                });
                return;
            }

            // Filter recipes by included ingredients
            let filteredRecipes = searchResult.results;
            if (includeIngredients) {
                const includeIngredientsList = includeIngredients.toLowerCase().split(',').map(ingredient => ingredient.trim());

                // Filter recipes to include all specified ingredients
                filteredRecipes = await Promise.all(filteredRecipes.map(async (recipe) => {
                    const recipeUrl = `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${apiKey}`;
                    const recipeResponse = await fetch(recipeUrl);
                    const recipeResult = await recipeResponse.json();

                    // filter recipes based on presence of specified ingredients
                    const recipeIngredients = recipeResult.extendedIngredients.map(ingredient => ingredient.name.toLowerCase());
                    const hasAllIngredients = includeIngredientsList.every(ingredient => recipeIngredients.includes(ingredient));

                    return hasAllIngredients ? recipeResult : null;
                }));

                // Removing recipes that did not pass the filter
                filteredRecipes = filteredRecipes.filter(recipe => recipe !== null);
            }

            // If there are no recipes after filtering
            if (filteredRecipes.length === 0) {
                await interaction.reply({
                    content: 'Failed to find a recipe with the included ingredients. Please try to include something else',
                    ephemeral: true
                });
                return;
            }

            // select random a recipe ID from search results
            const randomIndex = Math.floor(Math.random() * searchResult.results.length);
            const recipeId = searchResult.results[randomIndex].id;

            // create URL for detailed recipe information
            const recipeUrl = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`;
            console.log(`Fetching recipe URL: ${recipeUrl}`);

            // Fetch detailed recipe information
            const recipeResponse = await fetch(recipeUrl);
            if (!recipeResponse.ok) {
                throw new Error(`HTTP error! Status: ${recipeResponse.status}`);
            }

            const recipeResult = await recipeResponse.json();
            console.log('Recipe JSON Response:', recipeResult);

            // Extract instructions and ingredients; remove HTML tags from instructions
            const instructions = recipeResult.instructions
                ? recipeResult.instructions.replace(/<\/?[^>]+(>|$)/g, "")
                : "No instructions available";

            const ingredients = recipeResult.extendedIngredients
                ? recipeResult.extendedIngredients.map(ingredient => ingredient.original).join('\n')
                : "No ingredients available";


            // create embed message title according to users recipe request
            let title = `Recipe for ${dishType}: \n ${recipeResult.title}`;
            if (excludeIngredients) {
                title += ` without ${excludeIngredients}`;
            }
            if (includeIngredients) {
                title += ` with ${includeIngredients}`;
            }
            if (maxReadyTime) {
                title += `\n Takes ${maxReadyTime} minutes to prepare`;
            }

            // create the embed message
            const recipeEmbed = new EmbedBuilder()
                .setTitle(title)
                .setImage(recipeResult.image)
                .addFields({
                    name: 'Ingredients',
                    value: ingredients
                }, {
                    name: 'Instructions',
                    value: instructions
                })
                .setTimestamp();

            // Reply with the detailed recipe information
            await interaction.reply({
                embeds: [recipeEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error during fetch:', error);
            await interaction.reply({
                content: 'Failed to find recipe data. Please try again later.',
                ephemeral: true
            });
        }
    }
}];

export default recipeCommands;
