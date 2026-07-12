const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Purges an amount of messages in a channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption(option =>
			option.setName('amount')
				.setDescription('Amount of messages to purge.')
				.setRequired(true)),

	async execute(interaction) {
		const amount = interaction.options.getInteger('amount');
		if (amount <= 0 || amount > 100) {
			return interaction.reply({ content: `:x: You must specify an amount between 1 and 100!`, ephemeral: true });
		}

		try {
			await interaction.channel.bulkDelete(amount);
			console.log(`[Priv] ${interaction.user.tag} purged ${amount} messages in channel ${interaction.channel.id}.`);
			await interaction.reply({ content: `:hammer: Successfully purged ${amount} messages!`, ephemeral: true });
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: ":x: There was an error purging messages. (Are the messages older than 14 days? Is there a cooldown? This is a Discord API limitation UNFORTUNATELY.)", ephemeral: true });
		}
	},
};
