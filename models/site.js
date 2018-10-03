/**
 * 调试场地
 */

/**
  场地示例

  Site
  {
    name: '场地 1',
    description: '位于主楼 xxx, 有 xx 设备。',
    capacity: 10,
    minDuration: 60,
    maxDuration: 120,
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
    name: { type: String, required: true },
    description: String,
    capacity: { type: Number, default: 10, min: 1, max: 20 },
    // 最短或最长预约时间。
    minDuration: { type: Number, default: 60, min: 1, max: 120 },
    maxDuration: { type: Number, default: 120, min: 1, max: 360 },
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
