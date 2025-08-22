// ... same imports

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

module.exports = {
  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const userVoiceChannel = interaction.member.voice.channel;
    if (!userVoiceChannel) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ NO VOICE CHANNEL DETECTED")
            .setDescription("Join a voice channel first, then try again."),
        ],
      });
    }

    const playersInChannel = userVoiceChannel.members.filter(
      (member) => !member.user.bot
    );

    if (playersInChannel.size > 8) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ TOO MANY PLAYERS")
            .setDescription(
              `Found ${playersInChannel.size} players.\nMaximum 8 supported.`
            ),
        ],
      });
    }

    const otherActiveChannels = interaction.guild.channels.cache.filter(
      (channel) =>
        channel.isVoiceBased() &&
        channel.id !== userVoiceChannel.id &&
        channel.members.filter((member) => !member.user.bot).size > 0
    );

    const playerList = playersInChannel
      .map(
        (member) =>
          `• ${member.displayName}${
            member.id === interaction.user.id ? " (you)" : ""
          }`
      )
      .join("\n");

    // No other VCs → simple solo match start
    if (otherActiveChannels.size === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("🎙️ READY TO ASSIGN TEAMS!")
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setDescription(
              `Found **${playersInChannel.size} player${
                playersInChannel.size > 1 ? "s" : ""
              }** in **"${userVoiceChannel.name}"** voice channel:\n\n` +
                `\`\`\`\n${playerList}\n\`\`\``
            )
            .setFooter({ text: "Ready to start team selection?" }),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("teamsSolo_match")
              .setLabel("🚀 Start Team Selection")
              .setStyle(ButtonStyle.Success)
          ),
        ],
      });
    }

    // Multiple VCs → show match type choice
    const totalOtherPlayers = otherActiveChannels.reduce(
      (total, channel) =>
        total + channel.members.filter((m) => !m.user.bot).size,
      0
    );

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FFA500")
          .setTitle("🎯 SMART CHANNEL DETECTION")
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .addFields([
            {
              name: `🎙️ YOUR CHANNEL: "${userVoiceChannel.name}" (${
                playersInChannel.size
              } player${playersInChannel.size > 1 ? "s" : ""})`,
              value: `\`\`\`\n${playerList}\n\`\`\``,
            },
            {
              name: "📊 Other Active Channels",
              value: `• ${otherActiveChannels.size} channel${
                otherActiveChannels.size > 1 ? "s" : ""
              } with ${totalOtherPlayers} total player${
                totalOtherPlayers > 1 ? "s" : ""
              }`,
            },
            {
              name: "⚡ Choose Your Match Type",
              value:
                "👥 **Solo Match** - Just your channel\n⚔️ **VS Match** - Pick opponent channel",
            },
          ])
          .setFooter({ text: "Select an option below to proceed" }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("teamsSolo_match")
            .setLabel(`👥 Solo Match (${playersInChannel.size} players)`)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("multipleteams_match")
            .setLabel("⚔️ VS Match")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
  },

  name: "teams",
  description: "Start FIFA team randomizer for players in your voice channel.",
};
