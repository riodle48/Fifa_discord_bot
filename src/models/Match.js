// models/Match.js
const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Discord user ID
  name: { type: String, required: true }, // Display name
});

const channelSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Voice channel ID
  name: { type: String, required: true }, // Voice channel name
  players: [playerSchema], // Players in this channel
});

const matchSchema = new mongoose.Schema({
  guildId: { type: String, required: true }, // Discord server ID
  createdBy: { type: String, required: true }, // User who started the match
  matchType: { type: String, enum: ["solo", "vs"], required: true }, // Solo = 1 channel, VS = 2 channels

  // Channel data
  channel1: { type: channelSchema, required: true }, // Always present
  channel2: { type: channelSchema }, // Only present if VS match

  // Game settings
  gameVersion: {
    type: String,
    default: null,
  },
  teamType: {
    type: String,
    enum: ["club", "international", "random"],
    default: null,
  },
  ratingFilter: { type: String, default: null }, // e.g., "4 stars", "70-80 rating"
  leagueFilter: { type: String, default: null }, // Optional, only if teamType = club

  // Status tracking
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  assignedTeams: [
    {
      playerId: { type: String, required: false }, // Discord user ID
      team: {
        teamImg: String,
        teamName: String,
        leagueImg: String,
        leagueName: String,
        overall: String,
        attack: String,
        midfield: String,
        defence: String,
        possession: String,
        sa: String,
      },
    },
  ],
});

module.exports = mongoose.model("Match", matchSchema);
