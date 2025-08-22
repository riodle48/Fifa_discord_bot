const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Match = require("../../models/Match");
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isModalSubmit()) return;

    const [action, review, trainingId] = interaction.customId.split("_"); // Extract action and trainingId from customId
    switch (action) {
      case "leagueModal":
        await handleLeagueModal(client, interaction, review);
        break;
      case "ratingModal":
        await handleRatingModal(client, interaction, review);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.log(error);
  }
};

async function handleLeagueModal(client, interaction, matchId) {
  const leagueName = interaction.fields.getTextInputValue("leagueInput");

  const matchDoc = await Match.findById(matchId);
  if (!matchDoc) {
    return interaction.reply({
      content: "❌ Match not found.",
      ephemeral: true,
    });
  }

  matchDoc.leagueFilter = leagueName;
  await matchDoc.save();

  console.log(`✅ Updated match ${matchId} with leagueFilter: ${leagueName}`);

  await interaction.reply({
    content: `✅ League filter set to **${leagueName}** for this match.`,
    ephemeral: true,
  });
}

// handleRatingModal
async function handleRatingModal(client, interaction, matchId) {
  const ratingValue = interaction.fields
    .getTextInputValue("ratingValue")
    .trim();

  // Check if empty -> skip saving
  let ratingText = "";
  if (ratingValue) {
    const ratingNum = Number(ratingValue);

    if (
      isNaN(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 100 ||
      !Number.isInteger(ratingNum)
    ) {
      return interaction.reply({
        content: "❌ Rating must be a whole number between **1** and **100**.",
        ephemeral: true,
      });
    }

    // Save in DB only if provided
    const matchDoc = await Match.findById(matchId);
    if (!matchDoc) {
      return interaction.reply({
        content: "❌ Match not found.",
        ephemeral: true,
      });
    }

    matchDoc.ratingFilter = String(ratingNum);
    await matchDoc.save();

    ratingText = `\nRating Filter: **${ratingNum}**`;
  } else {
    ratingText = `\nRating Filter: **Random**`;
  }

  // Always fetch doc (to keep teamType/gameVersion info)
  const matchDoc = await Match.findById(matchId);

  const finalEmbed = new EmbedBuilder()
    .setColor("#00FF88")
    .setTitle("⚙️ Match Setup - Final Step")
    .setDescription(
      `Game: **${matchDoc.gameVersion.toUpperCase()}**\n` +
        `Team Type: **${matchDoc.teamType}**` +
        ratingText +
        "\nYou can either save the match now" +
        (matchDoc.teamType === "club"
          ? " or add a league filter before saving."
          : ".")
    );

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`saveMatch_${matchId}`)
      .setLabel("💾 Run")
      .setStyle(ButtonStyle.Success)
  );

  if (matchDoc.teamType === "club") {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`leagueFilter_${matchId}`)
        .setLabel("🏆 League Filter")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  await interaction.update({
    embeds: [finalEmbed],
    ephemeral: true,
    components: [actionRow],
  });
}
