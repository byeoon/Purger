const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('obfuscateauditlog')
		.setDescription('Hides audit log information by spamming junk changes.'),

	async execute(interaction) {
		const pingEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`WIP!`)
			.setDescription(`Work in progress`)
		await interaction.reply(({ embeds: [pingEmbed] }));
	},
};
