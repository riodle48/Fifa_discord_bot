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

module.exports = async (client, interaction) => {
  try {
    if (!interaction.isStringSelectMenu()) return;

    const [action, review, trainingId] = interaction.customId.split("_"); // Extract action and trainingId from customId
    switch (action) {
      case "MultipleTeamselect":
        await handleMultipleTeamselect(client, interaction);
        break;
      case "gameVersion":
        await handlegameVersion(client, interaction, review);
        break;
      case "teamType":
        await handleTeamType(client, interaction, review);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.log(error);
  }
};

async function handlegameVersion(client, interaction, matchId) {
  try {
    const selectedVersion = interaction.values[0]; // fifa23, fc24, fc25

    // Get match from DB
    const matchDoc = await Match.findById(matchId);
    if (!matchDoc) {
      return interaction.reply({
        content: "❌ Match not found.",
        ephemeral: true,
      });
    }

    // Update game version
    matchDoc.gameVersion = selectedVersion;
    await matchDoc.save();

    console.log(
      `✅ Updated match ${matchId} with gameVersion: ${selectedVersion}`
    );

    // Ask for team type
    const teamTypeEmbed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("⚽ Select Team Type")
      .setDescription("Please choose the type of teams for this match.");

    const teamTypeSelect = new StringSelectMenuBuilder()
      .setCustomId(`teamType_${matchId}`)
      .setPlaceholder("Select team type...")
      .addOptions([
        {
          label: "National Teams",
          description: "Only national teams",
          value: "international",
          emoji: "🌍",
        },
        {
          label: "Club Teams",
          description: "Only club teams",
          value: "club",
          emoji: "🏟️",
        },
      ]);

    const teamTypeRow = new ActionRowBuilder().addComponents(teamTypeSelect);

    await interaction.update({
      embeds: [teamTypeEmbed],
      ephemeral: true,
      components: [teamTypeRow],
    });
  } catch (e) {
    console.log(e);
  }
}

async function handleTeamType(client, interaction, matchId) {
  const selectedTeamType = interaction.values[0]; // 'club' or 'international'

  // Get match from DB
  const matchDoc = await Match.findById(matchId);
  if (!matchDoc) {
    return interaction.reply({
      content: "❌ Match not found.",
      ephemeral: true,
    });
  }

  // Update team type
  matchDoc.teamType = selectedTeamType;
  await matchDoc.save();

  const modal = new ModalBuilder()
    .setCustomId(`ratingModal_${matchId}`)
    .setTitle("⭐ Set Rating Filter");

  const ratingInput = new TextInputBuilder()
    .setCustomId("ratingValue")
    .setLabel("Enter rating (leave empty = random team)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const firstRow = new ActionRowBuilder().addComponents(ratingInput);
  modal.addComponents(firstRow);

  await interaction.showModal(modal);
}

async function handleMultipleTeamselect(client, interaction) {
  try {
    const opponentChannelId = interaction.values[0]; // ID of the opponent's VC
    const userVC = interaction.member.voice.channel;

    if (!userVC) {
      return interaction.reply({
        content: "❌ You must be in a voice channel to start a match!",
        ephemeral: true,
      });
    }

    const opponentVC = interaction.guild.channels.cache.get(opponentChannelId);
    if (!opponentVC) {
      return interaction.reply({
        content: "❌ Opponent channel not found.",
        ephemeral: true,
      });
    }

    // Get players from both channels
    const playersChannel1 = userVC.members
      .filter((m) => !m.user.bot)
      .map((m) => ({ id: m.id, name: m.displayName }));

    const playersChannel2 = opponentVC.members
      .filter((m) => !m.user.bot)
      .map((m) => ({ id: m.id, name: m.displayName }));

    // Create DB document
    const newMatch = await Match.create({
      guildId: interaction.guild.id,
      createdBy: interaction.user.id,
      matchType: "vs",
      channel1: {
        id: userVC.id,
        name: userVC.name,
        players: playersChannel1,
      },
      channel2: {
        id: opponentVC.id,
        name: opponentVC.name,
        players: playersChannel2,
      },
    });

    console.log("✅ Match created:", newMatch.id);

    // Ask for game version
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
  } catch (e) {
    console.log(e);
  }
}
