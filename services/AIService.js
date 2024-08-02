require('dotenv/config');
const AlcoholService = require('../services/AlcoholService.js');
const UtilityLibrary = require('../libraries/UtilityLibrary.js');
const MessageService = require('../services/MessageService.js');
const MoodService = require('../services/MoodService.js');
const ComfyUIWrapper = require('../wrappers/ComfyUIWrapper.js');
const DiscordWrapper = require('../wrappers/DiscordWrapper.js');
const OpenAIWrapper = require('../wrappers/OpenAIWrapper.js');
const LocalAIWrapper = require('../wrappers/LocalAIWrapper.js');
const BarkAIWrapper = require('../wrappers/BarkAIWrapper.js');
const AnthrophicWrapper = require('../wrappers/AnthropicWrapper.js');
const PuppeteerWrapper = require('../wrappers/PuppeteerWrapper.js');

const {
    LANGUAGE_MODEL_TYPE,
    RECENT_MESSAGES_LIMIT,
    IMAGE_PROMPT_LANGUAGE_MODEL_TYPE,
    IMAGE_PROMPT_LANGUAGE_MODEL_MAX_TOKENS,
    IMAGE_PROMPT_LANGUAGE_MODEL_PERFORMANCE,
    VOICE_MODEL_TYPE,
} = require('../config.json');

async function generateText({ conversation, type = LANGUAGE_MODEL_TYPE, performance, tokens }) {
    let text;
    if (type === 'OPENAI') {
        text = await OpenAIWrapper.generateText(conversation, tokens, performance);
    } else if (type === 'ANTHROPIC') {
        text = await AnthrophicWrapper.generateText(conversation, tokens, performance);
    } else if (type === 'LOCAL') {
        text = await LocalAIWrapper.generateText(conversation, tokens);
    }
    return text;
}

async function generateImage(text) {
    const image = await ComfyUIWrapper.generateImage(text);
    return image;
}

async function generateVoice(text) {
    let filename;
    let buffer;
    if (text) {
        if (VOICE_MODEL_TYPE === 'OPENAI') {
            buffer = await OpenAIWrapper.generateVoiceResponse(text);
        } else if (VOICE_MODEL_TYPE === 'BARKAI') {
            const voice = await BarkAIWrapper.generateVoice(text);
            if (voice.file_name) {
                filename = voice.file_name;
            }
        }
    }

    return { filename, buffer };
}

async function generateUsersSummary(client, message, recent100Messages) {
    const uniqueUsers = Array.from(new Map(recent100Messages.map(msg => [msg?.author?.id || msg?.user?.id, msg])).values());

    const arrayOfUsers = uniqueUsers.map((user) => {
        if (user.author.id === client.user.id || user.author.id === message.author.id) return;
        const userMessages = recent100Messages.filter(msg => msg.author.id === user.author.id);
        const userMessagesAsText = userMessages.map(msg => msg.content).join('\n\n');
        let conversation = [
            {
                role: 'system',
                content: `
                    You are an expert at giving detailed summaries of what is said to you.
                    You will go through the messages that are sent to you, and give a detailed summary of what is said to you.
                    You will describe the messages that are sent to you as detailed and creative as possible.
                    The messages that are sent are what ${DiscordWrapper.getNameFromItem(user)} has been talking about.
                    Start your description with: "### What ${DiscordWrapper.getNameFromItem(user)} has been talking about", before the summary is given.
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: ` Here are the last recent messages by ${DiscordWrapper.getNameFromItem(user)} in this channel, and is what they have been talking about:
                ${userMessagesAsText}`,
            }
        ];
        const usersSummary = generateText({ conversation, type: 'OPENAI', performance: 'FAST' });
        return usersSummary;
    }).filter(Boolean);

    const allMessages = await Promise.allSettled(arrayOfUsers);
    let generateCurrentConversationUsersSummary = '## Secondary Participants Conversations\n\n';
    // generateCurrentConversationUsersSummary += '// These people are also in the chat,
    allMessages.forEach((result) => {
        if (result.status === 'fulfilled') {
            generateCurrentConversationUsersSummary += result.value + `\n\n`;
        }
    });
    return generateCurrentConversationUsersSummary;
}

async function generateCurrentUserSummary(client, message, recent100Messages, userMessages) {
    let generateCurrentConversationUserSummary;
    if (userMessages.size > 0) {
        const combinedMessages = [...userMessages.values()].map(msg => msg.content).join('\n\n');
        let conversation = [
            {
                role: 'system',
                content: `
                    You are an expert at giving detailed summaries of what is said to you.
                    Your name is ${client.user.displayName}.
                    You will go through the messages that are sent to you, and give a detailed summary of what is said to you.
                    You will describe the messages that are sent to you as detailed and creative as possible.
                    The messages that are sent are what ${DiscordWrapper.getNameFromItem(message)} has been talking about.
                    Start your description with: "### What ${DiscordWrapper.getNameFromItem(message)} has been talking about", before the summary is given.
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: ` Here are the last recent messages by ${DiscordWrapper.getNameFromItem(message)} in this channel, and is what they have been talking about:
                ${combinedMessages}`,
            }
        ];
        const response = await generateText({ conversation, performance: 'FAST', tokens: 360 })
        generateCurrentConversationUserSummary = response;
    }
    return generateCurrentConversationUserSummary;
}

async function generateConversationFromRecentMessages(message, client, alerts, trends, news) {
    let newsSummary = '';
    if (alerts?.length) {
        let alertsText = `# Latest News Articles:\n\n`;
        alertsText += alerts.map(alert => `## ${alert.title}\n- Description: ${alert.description}\n- Source: ${alert.url}\n\n`).join('');
        newsSummary = await generateNewsSummary(message, alertsText);
        newsSummary = `# Latest News Articles:\n${newsSummary}`;
    }
    
        
    const urls = message.content.match(/(https?:\/\/[^\s]+)/g);
    let scrapedURL;
    if (urls?.length) {
        const url = urls[0];
        if (!url.includes('tenor') && !url.includes('gif')) {
            const isImage = await UtilityLibrary.isImageUrl(url);
            if (isImage) {
                console.log("image");
            } else {
                scrapedURL = await PuppeteerWrapper.scrapeURL(url);
            }
        }
    }

    let conversation = [];
    // let recentMessages = (await message.channel.messages.fetch({ limit: RECENT_MESSAGES_LIMIT })).reverse();
    let recent100Messages = (await message.channel.messages.fetch({ limit: 100 })).reverse();

    let recent100MessagesArray = recent100Messages.map((msg) => msg);

    const authorId = message.author.id

    const lastAuthorIndex = recent100MessagesArray.map(msg => msg.author.id).lastIndexOf(authorId);
    const filteredRecent100Messages = recent100MessagesArray.slice(0, lastAuthorIndex + 1);
    const recentMessages = filteredRecent100Messages.slice(-RECENT_MESSAGES_LIMIT);

    const userMessages = recent100Messages.filter(msg => msg.author.id === authorId);

    const generateCurrentUserSummaryy = await generateCurrentUserSummary(client, message, filteredRecent100Messages, userMessages);
    const generateUsersSummaryy = await generateUsersSummary(client, message, filteredRecent100Messages);
    const generateCurrentConversationUsers = await MessageService.generateCurrentConversationUsers(client, message, filteredRecent100Messages);

    const roles = UtilityLibrary.discordRoles(message.member);

    conversation.push({
        role: 'system',
        content: `
# General Information
- Name: ${client.user.displayName}.
- ID: ${client.user.id}.
- Traits: ${roles}.

${news}

# URL Information
${scrapedURL ? `## ${urls[0]}.` : ''}
${scrapedURL ? `- Title: ${scrapedURL.title}.` : ''}
${scrapedURL ? `- Description: ${scrapedURL.description}.` : ''}
${scrapedURL ? `- Keywords: ${scrapedURL.keywords}.` : ''}

${newsSummary}

${trends}

${MessageService.generateDateMessage()}
${MessageService.generateServerKnowledge(message)}
${MessageService.generateCurrentConversationUser(message)}
${generateCurrentUserSummaryy}
${generateCurrentConversationUsers}
${generateUsersSummaryy}
${MessageService.generateAssistantMessage()}
${MessageService.generateBackstoryMessage(message.guild?.id)}
${MessageService.generatePersonalityMessage()}
${MessageService.generateServerSpecificMessage(message.guild?.id)}`
    });

    recentMessages.forEach((msg) => {
        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: UtilityLibrary.getUsernameNoSpaces(msg),
                content: msg.content,
            });
        } else {
            conversation.push({
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(msg),
                content: `${msg.author.displayName ? UtilityLibrary.capitalize(msg.author.displayName) : UtilityLibrary.capitalize(msg.author.username)} said ${msg.content}.`,
            })
        }
    })

    // console.info('║ 📜 Conversation:', conversation)
    return conversation;
}

async function generateNewsSummary(message, text) {
    const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    let conversation = [
        {
            role: 'system',
            content: `Summarize the following news articles.
            For any repeated or related news, combine them, while keeping sources.
            
            Output format:
            ## {article title}
            - Description: {article name}
            ### Sources:
            - {article source1}
            -  {article source2}
            - ...`
        },
        {
            role: 'user',
            name: UtilityLibrary.getUsernameNoSpaces(message),
            content: text,
        }
    ]
    
    const response = await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 1200 })
    // UtilityLibrary.consoleInfo([[`║ 💡 News: `, { }], [response, { }]]);
    clearInterval(sendTypingInterval);
    return response;
}

async function generateTopicAtHand(message, text) {
    const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    let conversation = [
        {
            role: 'system',
            content: `
            # Role
            Return the topic that is being talked about.
            Do not explain, just return the topic that is mentioned as concisely as possible, while being accurate.
            `
        },
        {
            role: 'user',
            name: UtilityLibrary.getUsernameNoSpaces(message),
            content: text,
        }
    ]
    
    const response = await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 256 })
    UtilityLibrary.consoleInfo([[`║ 💡 Topic: `, { }], [response, { }]]);
    clearInterval(sendTypingInterval);
    return response;
}

async function generateNotCapableResponseCheck(message, text) {
    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
    let conversation = [
        {
            role: 'system',
            content: `
                You are an expert at determining if a given message indicates an inability to fulfill a request. If the message is similar to "I'm sorry, but I can't provide a response", "I can't fulfill this request", "I'm unable to do that", or "I'm not capable of that", answer with "yes". Otherwise, answer with "no". Do not type anything else besides "yes" or "no".
            `
        },
        {
            role: 'user',
            name: UtilityLibrary.getUsernameNoSpaces(message),
            content: text,
        }
    ]
    
    const response = await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 256 })
    clearInterval(sendTypingInterval);
    return response;
}


function generateConversation(systemMessage, userMessage, message) {
    let conversation = [
        {
            role: 'system',
            content: systemMessage
        },
        {
            role: 'user',
            name: UtilityLibrary.getUsernameNoSpaces(message),
            content: userMessage,
        }
    ]
    return conversation;
}

// async function generateResponseFromCustomConversation(conversation, type = LANGUAGE_MODEL_TYPE, performance = 'POWERFUL', tokens = 360) {
//     return await generateText({ conversation, type, performance, tokens });
// }

// async function generateImageRaw(text) {
//     DiscordWrapper.setActivity(`🎨 Drawing for ${DiscordWrapper.getNameFromItem(message)}...`);
//     UtilityLibrary.consoleInfo([[`║ 📑 Image: `, { }], [{ prompt: text }, { }]]);
//     return await generateImage(text);
// }

const AIService = {
    async generateTextFromSystemUserMessages(systemMessage, userMessage, message) {
        const conversation = generateConversation(systemMessage, userMessage, message);
        return await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 600 });
    },
    async generateText({ message, type, performance, tokens }) {
        UtilityLibrary.consoleInfo([[`║ 📑 Text: generation started`, { color: 'yellow' }]]);
        try {
            const client = DiscordWrapper.getClient();
            DiscordWrapper.setActivity(`✍️ Replying to ${DiscordWrapper.getNameFromItem(message)}...`);
    
            // const messageContent = await generateTopicAtHand(message, message.content);
            let alerts;
            // if (messageContent) {
            //     alerts = await PuppeteerWrapper.scrapeGoogleAlerts(messageContent);
            // }
            // const trends = await PuppeteerWrapper.scrapeRSSGoogleTrends();
            const trends = '';
            // const news = await AIService.generateGoogleNews(message);
            const news = '';
            const conversation = await generateConversationFromRecentMessages(message, client, alerts, trends, news);
            const generatedText = await generateText({ conversation, type, performance, tokens });
            UtilityLibrary.consoleInfo([[`║ 📑 Text: generation successful`, { color: 'green' }]]);
            return generatedText;
        } catch (error) { 
            console.log(error)
            UtilityLibrary.consoleInfo([[`║ 📑 Text: generation failed`, { color: 'red' }]]);
            return;
        }
    },
    async generateImage(message, text) {
        UtilityLibrary.consoleInfo([[`║ 🖼️ Image: generation started`, { color: 'yellow' }]]);
        try {
            await ComfyUIWrapper.checkWebsocketStatus();
            DiscordWrapper.setActivity(`🎨 Drawing for ${DiscordWrapper.getNameFromItem(message)}...`);

            let textToDraw;
            let generatedImage;
            const draw = ['draw', 'sketch', 'paint', 'image', 'make', 'redo'].some(substring => message.content.includes(substring));
            if (draw) {
                textToDraw = message.content.replace(/(.*draw |.*sketch |.*paint |.*image |.*make |.*redo ) /, '');
                generatedImage = await generateImage(textToDraw);
            } else {
                const username = UtilityLibrary.discordUsername(message.author || message.member);
                const randomText = [
                    `Always include: A speech bubble that says: "${username}".`,
                    `Always include: Holding a sign that says: "${username}".`,
                ]
                const pickRandomText = randomText[Math.floor(Math.random() * randomText.length)];
                let conversation = [
                    {
                        role: 'system',
                        content: `
                            # Purpose: Text-to-Image Prompt Generator
                            You generate text-to-image prompts for tools such as stable diffusion, midjourney, and other related platforms.
                            ${pickRandomText}
                            
                            Keep the prompt short and under 2 sentences. Make sure the prompt is clear and concise.
    
                            ${MessageService.generateServerSpecificMessage(message.guild?.id)}\n
                        `
                    },
                    {
                        role: 'user',
                        name: UtilityLibrary.getUsernameNoSpaces(message),
                        content: `Make a prompt based on this: ${message.content}`,
                    }
                ]
                const response = await generateText({ conversation, type: IMAGE_PROMPT_LANGUAGE_MODEL_TYPE, performance: IMAGE_PROMPT_LANGUAGE_MODEL_PERFORMANCE, tokens: IMAGE_PROMPT_LANGUAGE_MODEL_MAX_TOKENS })
                let responseContentText = response;
                let notCapable = await generateNotCapableResponseCheck(message, responseContentText);
                if (notCapable.toLowerCase() === 'yes') {
                    responseContentText = text ? text : message.content;
                }
                // UtilityLibrary.consoleInfo([[`║ 📑 Image: `, { }], [{ prompt: responseContentText }, { }]]);
                generatedImage = await generateImage(responseContentText);
            }
            UtilityLibrary.consoleInfo([[`║ 🖼️ Image: generation successful`, { color: 'green' }]]);
            return generatedImage;
        } catch (error) {
            UtilityLibrary.consoleInfo([[`║ 🖼️ Image: generation failed`, { color: 'red' }]]);
            return;
        }
    },
    async generateVoice(message, text) {
        DiscordWrapper.setActivity(`🗣️ Recording for ${DiscordWrapper.getNameFromItem(message)}...`);
        UtilityLibrary.consoleInfo([[`║ 🔊 Audio: `, { }], [{ prompt: text }, { }]]);
        const { filename, buffer } = await generateVoice(text);
        return { filename, buffer };
    },
    async generateVision(imageUrl, text) {
        return await OpenAIWrapper.generateVisionResponse(imageUrl, text);
    },
    async generateMoodTemperature(message) {
        await message.channel.sendTyping();
        const sendTypingInterval = setInterval(() => { message.channel.sendTyping() }, 5000);
        let conversation = [
            {
                role: 'system',
                content: `
                    ${MessageService.generateBackstoryMessage(message.guild?.id)}
                    ${MessageService.generatePersonalityMessage()}
                    You are an expert at telling if a conversation is positive, neutral or negative, but taking into account how your character would perceive it and react to it. You will only answer with a between from -10 to 10. -10 Being the most negative, 0 being mostly neutral, and 12 being as positive as possible. The number you pick between -10 to 10 will depend on the tone of the conversation, and nothing else. You do not type anything else besides the number that indicates the tone of the conversation. Only a number between -10 to 10, nothing else. You only output a number, an integer, nothing else.
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: message.content,
            }
        ]
        
        let response = await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 3 });
        clearInterval(sendTypingInterval);
        return response;
    },
    async generateGoogleNews(message) {
        const url = 'https://news.google.com/rss?gl=US&hl=en-US&ceid=US:en';
        const items = await PuppeteerWrapper.scrapeRSS(url);
    
        let userMessage = "# Latest News\n";
        items.forEach((item) => {
            const title = item.title;
            const pubDate = UtilityLibrary.getCurrentDateAndTime(item.pubDate);
            const minutesAgo = UtilityLibrary.getMinutesAgo(item.pubDate);
            const link = item.link;
            const description = item.description || '';
    
            userMessage += `## Title: ${title}\n`;
            userMessage += `- Date: ${pubDate}\n`;
            userMessage += `- Minutes ago: ${minutesAgo}\n`;
            userMessage += `- Link: ${link}\n\n`

            // if (description.a?._ && description.a?.href) {
            //     userMessage += `- Description: ${description.a._}\n`;
            //     userMessage += `- Link: ${description.a.href}\n`;
            // }

            // description.ol?.li?.forEach((each => {
            //     userMessage += `- Description: ${each.a._}\n`;
            //     userMessage += `- Link: ${each.a.href}\n`;
            // }))

        });
        userMessage += `If any, return the most related news to this: ${message.content}`;

        const systemMessage = `#Task:\n-You return the most related news, and summarize the description without adding more information.\n-If there is no related news, return an empty string.\n\n#Output Format:
        -## Title: [Title]
        -Date: [Date]
        -Minutes ago: [Minutes]
        -Link: [Link]
        -Description: [Description]
        
        #Output:`;

        const conversation = generateConversation(systemMessage, userMessage, message)
        return await generateText({conversation, type: 'OPENAI', performance: 'FAST'})
    },
};

module.exports = AIService;
