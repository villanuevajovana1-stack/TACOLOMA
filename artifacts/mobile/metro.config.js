const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const root = path.resolve(__dirname, "../..");

config.watchFolders = [root];

const { blockList } = config.resolver;
const blockListRE = Array.isArray(blockList) ? blockList : blockList ? [blockList] : [];

config.resolver.blockList = [
  ...blockListRE,
  /node_modules\/mongoose\/.*/,
  /node_modules\/.pnpm\/mongoose.*/,
  /node_modules\/.pnpm\/mongodb.*/,
  /node_modules\/.pnpm\/bson.*/,
];

module.exports = config;
