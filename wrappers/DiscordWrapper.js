require('dotenv/config');
const { Client, Collection, Events, GatewayIntentBits, Partials, ChannelType, Message } = require('discord.js');

let client;

const DiscordWrapper = {
    instantiate() {
        client = new Client({
            intents: [
              GatewayIntentBits.Guilds, 
              GatewayIntentBits.GuildMembers,
              GatewayIntentBits.GuildPresences, 
              GatewayIntentBits.GuildMessages, 
              GatewayIntentBits.MessageContent, 
              GatewayIntentBits.DirectMessages,
              GatewayIntentBits.GuildMessageReactions,
              GatewayIntentBits.GuildEmojisAndStickers
            ],
            partials: [
              Partials.Channel,
              Partials.Message,
              Partials.Reaction
            ]
        });
        return client;
    },
    getClient() {
        return client;
    },
    setActivity(message) {
      return client.user.setActivity(message, { type: 4 });
    },
    getNameFromItem(item) {
      return item?.author?.displayName || item?.author?.username || item?.user?.globalName || item?.user?.username;
    },
    async patchBanner(imageUrl) {
      return await client.rest.patch("/users/@me", { body: { banner: "data:image/gif;base64," + Buffer.from(imageUrl).toString('base64') } });
    },
    async patchBannerFromImageUrl(imageUrl) {
      return await client.rest.patch("/users/@me", { body: { banner: "data:image/gif;base64," + Buffer.from(await (await fetch(imageUrl)).arrayBuffer()).toString('base64') } });
    },
    async getBannerFromUserId(userId) {
      const getUser = await client.rest.get(`/users/${userId}`);
      return getUser.banner;
    },
};

module.exports = DiscordWrapper;
