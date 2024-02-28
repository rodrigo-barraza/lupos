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
              GatewayIntentBits.DirectMessages
            ],
            partials: [
              Partials.Channel,
              Partials.Message
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
    }
};

module.exports = DiscordWrapper;
