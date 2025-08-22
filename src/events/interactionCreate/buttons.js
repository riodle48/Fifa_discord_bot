const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Match = require("../../models/Match");

const fifaData = require("../../../data.json");
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isButton()) return;

    const [action, review, trainingId] = interaction.customId.split("_"); // Extract action and trainingId from customId
    switch (action) {
      case "multipleteams":
        await handleMultipleTeams(client, interaction);
        break;
      case "teamsSolo":
        await handleTeamSoloMatch(client, interaction);
        break;
      case "leagueFilter":
        await handleLeagueFilter(client, interaction, review);
        break;
      case "saveMatch":
        await handleHandleRandomData(client, interaction, review);
        break;
      case "detailedView":
        await handleDetailedView(client, interaction, review);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.log(error);
  }
};

async function handleMultipleTeams(client, interaction) {
  try {
    const userVoiceChannel = interaction.member.voice.channel;

    const otherActiveChannels = interaction.guild.channels.cache.filter(
      (channel) =>
        channel.isVoiceBased() &&
        channel.id !== userVoiceChannel.id &&
        channel.members.filter((m) => !m.user.bot).size > 0
    );

    const channelSelectOptions = otherActiveChannels.map((channel) => {
      const channelPlayers = channel.members.filter((m) => !m.user.bot);
      return {
        label: `${channel.name} (${channelPlayers.size} players)`,
        description: `${
          userVoiceChannel.members.filter((m) => !m.user.bot).size
        }v${channelPlayers.size} match`,
        value: channel.id,
      };
    });

    await interaction.update({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setColor("#00BFFF")
          .setTitle("⚔️ SELECT OPPONENT CHANNEL")
          .setDescription("Choose which voice channel you want to challenge."),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("MultipleTeamselect_opponent")
            .setPlaceholder("🎯 Select opponent channel")
            .addOptions(channelSelectOptions.slice(0, 25))
        ),
      ],
    });
  } catch (e) {
    console.log(e);
  }
}

async function handleTeamSoloMatch(client, interaction) {
  const userVC = interaction.member.voice.channel;
  if (!userVC) {
    return interaction.reply({
      content: "❌ You must be in a voice channel to start a match!",
      ephemeral: true,
    });
  }

  // Get players
  const players = userVC.members
    .filter((m) => !m.user.bot)
    .map((m) => ({
      id: m.id,
      name: m.displayName,
    }));

  // Create DB document
  const newMatch = await Match.create({
    guildId: interaction.guild.id,
    createdBy: interaction.user.id,
    matchType: "solo",
    channel1: {
      id: userVC.id,
      name: userVC.name,
      players,
    },
  });

  console.log("✅ Match created:", newMatch.id);

  // Ask for game version (as string select menu)
  const gameEmbed = new EmbedBuilder()
    .setColor("#00AAFF")
    .setTitle("🎮 Select FIFA Version")
    .setDescription(
      "Please choose which game version you are playing for this match."
    );

  const gameSelect = new StringSelectMenuBuilder()
    .setCustomId(`gameVersion_${newMatch.id}`)
    .setPlaceholder("Select FIFA version...")
    .addOptions([
      {
        label: "FIFA 23",
        description: "Play on FIFA 23",
        value: "fc23",
        emoji: "🎮",
      },
      {
        label: "FC 24",
        description: "Play on EA Sports FC 24",
        value: "fc24",
        emoji: "⚽",
      },
      {
        label: "FC 25",
        description: "Play on EA Sports FC 25",
        value: "fc25",
        emoji: "🔥",
      },
    ]);

  const gameRow = new ActionRowBuilder().addComponents(gameSelect);

  await interaction.update({
    embeds: [gameEmbed],
    ephemeral: true,
    components: [gameRow],
  });
}

async function handleLeagueFilter(client, interaction, matchId) {
  // Check match exists
  const matchDoc = await Match.findById(matchId);
  if (!matchDoc) {
    return interaction.reply({
      content: "❌ Match not found.",
      ephemeral: true,
    });
  }

  // Create modal
  const modal = new ModalBuilder()
    .setCustomId(`leagueModal_${matchId}`)
    .setTitle("🏆 Set League Filter");

  // League input
  const leagueInput = new TextInputBuilder()
    .setCustomId("leagueInput")
    .setLabel("Enter the league name")
    .setPlaceholder("Example: Premier League, La Liga, Serie A...")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstRow = new ActionRowBuilder().addComponents(leagueInput);

  modal.addComponents(firstRow);

  // Show modal to user
  await interaction.showModal(modal);
}

async function handleHandleRandomData(client, interaction, matchId) {
  try {
    const matchDoc = await Match.findById(matchId);
    if (!matchDoc)
      return interaction.reply({
        content: "❌ Match not found.",
        ephemeral: true,
      });

    const {
      gameVersion,
      teamType,
      ratingFilter,
      channel1,
      channel2,
      leagueFilter,
    } = matchDoc;

    console.log(matchDoc);

    // Combine all players
    const allPlayers = [...channel1.players, ...(channel2?.players || [])];

    if (allPlayers.length === 0)
      return interaction.reply({
        content: "❌ No players found.",
        ephemeral: true,
      });
    console.log(teamType);
    // Get teams and apply filters
    let teams =
      fifaData[gameVersion]?.[
        teamType === "international" ? "national" : "club"
      ] || [];

    if (ratingFilter) {
      const ratingNum = parseInt(ratingFilter);
      if (!isNaN(ratingNum))
        teams = teams.filter((t) => parseInt(t.overall) >= ratingNum);
    }

    let finalTeams = [];

    if (teamType === "club" && leagueFilter) {
      const filterLower = leagueFilter.toLowerCase();

      // Teams that match the filter
      const matchingTeams = teams.filter(
        (t) => t.leagueName && t.leagueName.toLowerCase().includes(filterLower)
      );

      // Remaining teams
      const remainingTeams = teams.filter((t) => !matchingTeams.includes(t));

      // Shuffle both lists separately
      const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);
      finalTeams = [
        ...shuffleArray(matchingTeams),
        ...shuffleArray(remainingTeams),
      ];
    } else {
      // Normal shuffle for everything
      finalTeams = [...teams].sort(() => Math.random() - 0.5);
    }

    if (finalTeams.length < allPlayers.length) {
      return interaction.reply({
        content:
          "❌ Not enough teams to assign all players without duplicates.",
        ephemeral: true,
      });
    }

    // Shuffle and assign unique teams
    // const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const assignments = allPlayers.map((player, idx) => ({
      player,
      team: finalTeams[idx],
    }));

    let description =
      `🎮 **Game:** \`${gameVersion.toUpperCase()}\`\n` +
      `🏟️ **Type:** \`${teamType}\`\n` +
      `📅 **Match ID:** \`#${matchDoc._id.toString().slice(-5)}\`\n` +
      `⭐ **Rating:** \`${
        ratingFilter && ratingFilter.trim() !== "" ? ratingFilter : "Random"
      }\`\n` +
      `👥 **Players:** \`${allPlayers.length}\`\n` +
      "━━━━━━━━━━━━━━━━━━━━\n\n";

    // Channel 1
    description += `🎙️ **${channel1.name}**\n\`\`\`\n`;
    channel1.players.forEach((p) => {
      const assigned = assignments.find((a) => a.player.id === p.id);
      description += `• 👤 ${p.name}  →  🏆 ${assigned.team.teamName}${
        assigned.team.leagueName ? ` | 🌍 ${assigned.team.leagueName}` : ""
      }\n`;
    });
    description += `\`\`\`\n`;

    // Channel 2 if VS match
    if (channel2) {
      description += `🎙️ **${channel2.name}**\n\`\`\`\n`;
      channel2.players.forEach((p) => {
        const assigned = assignments.find((a) => a.player.id === p.id);
        description += `• 👤 ${p.name}  →  🏆 ${assigned.team.teamName}${
          assigned.team.leagueName ? ` | 🌍 ${assigned.team.leagueName}` : ""
        }\n`;
      });
      description += `\`\`\`\n`;
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🏆 FIFA TEAM RANDOMIZER RESULTS")
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setDescription(description)
      .setFooter({ text: "Click ℹ️ Detailed View for more stats" });

    // Action row with Detailed View button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`detailedView_${matchDoc.id}`)
        .setLabel("ℹ️ Detailed View")
        .setStyle(ButtonStyle.Primary)
    );

    // Get channel ID from env
    const targetChannelId = process.env.FIFA_TEAMS_CHANNEL_ID;
    const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

    if (!targetChannel) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000") // red for error
        .setDescription(
          "❌ **Error:** Could not find the configured FIFA Teams channel.\n\n" +
            "🔧 **How to fix:**\n" +
            "1. Make sure you have a text channel created in your server where you want the results sent.\n" +
            "2. Copy the channel ID (Right-click the channel → **Copy Channel ID**).\n" +
            "3. Open your `.env` file and set it like this:\n" +
            "```env\nFIFA_TEAMS_CHANNEL_ID=YOUR_CHANNEL_ID_HERE\n```\n" +
            "4. Restart the bot after saving the `.env` file.\n\n" +
            "➡️ Example:\n```env\nFIFA_TEAMS_CHANNEL_ID=123456789012345678\n```"
        );

      return interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });
    }

    await targetChannel.send({ embeds: [embed], components: [row] });

    await interaction.update({
      content: "✅ Teams randomized and sent to #fifa-teams-bot!",
      ephemeral: true,
      components: [],
      embeds: [],
    });

    matchDoc.assignedTeams = assignments.map((a) => ({
      playerId: a.player.id,
      team: a.team,
    }));

    await matchDoc.save();
  } catch (e) {
    console.error(e);
    interaction.reply({
      content: "❌ Error generating random teams.",
      ephemeral: true,
    });
  }
}

async function handleDetailedView(client, interaction, matchId) {
  const matchDoc = await Match.findById(matchId);
  if (!matchDoc)
    return interaction.reply({
      content: "❌ Match not found.",
      ephemeral: true,
    });

  const userTeam = matchDoc.assignedTeams.find(
    (t) => t.playerId === interaction.user.id
  );

  if (!userTeam)
    return interaction.reply({
      content: "❌ You are not part of this match.",
      ephemeral: true,
    });

  const { team } = userTeam;

  const embed = new EmbedBuilder()
    .setColor("#00AAFF")
    .setTitle(`Your FIFA Team: ${team.teamName}`)
    .setThumbnail(team.teamImg) // Guild icon
    .addFields([
      { name: "🏆 Team", value: `${team.teamName}`, inline: true },
      { name: "🌍 League", value: `${team.leagueName || "N/A"}`, inline: true },
      {
        name: "📊 Stats",
        value: `\`\`\`
⚡ ATT: ${team.attack}   🎯 MID: ${team.midfield}
🛡️ DEF: ${team.defence}   ⭐ Overall: ${team.overall}
\`\`\``,
      },
    ])
    .setFooter({ text: "Your team has been assigned! Good luck!" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
