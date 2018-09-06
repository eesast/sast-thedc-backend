/**
 * 队伍
 */

/**
  队伍示例

  Team
  {
    name: 'Team 1',
    description: 'Winner winner, chicken dinner!',
    members: [6, 7, 8, 9],
    captain: 6,
    inviteCode: 'Xs5cs11',
    createdAt: '2018-05-16T17:01:42.346Z',
  }
*/

const autoIncrement = require("mongoose-auto-increment");
const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    members: [Number],
    captain: Number,
    inviteCode: String,
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: "teams"
  }
);

teamSchema.plugin(autoIncrement.plugin, "Team");
const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
