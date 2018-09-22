/**
 * 调试场地
 */

/**
  场地示例

  Site
  {
    name: '场地 1',
    description: '位于主楼 xxx, 有 xx 设备。',
    appointments: [
      {
        teamId: 0,
        startTime: 2018-09-19T14:00:00.346Z,
        endTime: 2018-09-19T15:00:00.346Z
      }
    ],
    createdAt: '2018-05-16T17:01:42.346Z'
  }
*/

const autoIncrement = require("mongoose-auto-increment");
const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    appointments: [{ teamId: Number, startTime: Date, endTime: Date }],
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: "sites"
  }
);

siteSchema.plugin(autoIncrement.plugin, "Site");
const Site = mongoose.model("Site", siteSchema);

module.exports = Site;
