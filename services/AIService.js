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

async function generateText({ conversation, type=LANGUAGE_MODEL_TYPE, performance, tokens }) {
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

async function generateUsersConversationsSummary(client, message, recent100Messages) {
    const usersConversations = {};
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
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: ` Here are the last recent messages by ${DiscordWrapper.getNameFromItem(user)} in this channel, and is what they have been talking about:
                ${userMessagesAsText}`,
            }
        ];
        // const generatedText = generateText({ conversation, type: 'OPENAI', performance: 'FAST' });
        // user.author.id
        const generatedTextPromise = generateText({ conversation, type: 'OPENAI', performance: 'FAST' });
        return generatedTextPromise.then(generatedText => ({userId: user.author.id, generatedText}));
        // return generatedText;
    }).filter(Boolean);

    let generateCurrentConversationUsersSummary = '';
    const allMessages = await Promise.allSettled(arrayOfUsers);
    if (allMessages.length) {
        generateCurrentConversationUsersSummary = '# Secondary Participants Conversations';
        // generateCurrentConversationUsersSummary += '// These people are also in the chat,
        allMessages.forEach((result) => {
            if (result.status === 'fulfilled') {
                generateCurrentConversationUsersSummary += `\n${result.value.generatedText}`;
                usersConversations[result.value.userId] = result.value.generatedText;
                // usersConversations[result.value.userId] = result.value.generatedText;
            }
        });
    }
    return { generateCurrentConversationUsersSummary, usersConversations };
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
                `
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: ` Here are the last recent messages by ${DiscordWrapper.getNameFromItem(message)} in this channel, and is what they have been talking about:
                ${combinedMessages}`,
            }
        ];
        const generatedText = await generateText({ conversation, performance: 'FAST', tokens: 360 })
        // let response = `# What ${DiscordWrapper.getNameFromItem(message)} has been talking about`
        // response += `${generatedText}`;
        generateCurrentConversationUserSummary = generatedText;
    }
    return generateCurrentConversationUserSummary;
}

async function generateConversationFromRecentMessages(message, client, alerts, trends, news, imagePrompt, userMentions, userReply) {
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
                // console.log("image");
            } else {
                scrapedURL = await PuppeteerWrapper.scrapeURL(url);
            }
        }
    }

    let conversation = [];

    const messageContent = message.content;
    let recent100Messages = (await message.channel.messages.fetch({ limit: 100 })).reverse();
    message.content = messageContent;

    let recent100MessagesArray = recent100Messages.map((msg) => msg);

    const authorId = message.author.id

    const lastAuthorIndex = recent100MessagesArray.map(msg => msg.author.id).lastIndexOf(authorId);
    const filteredRecent100Messages = recent100MessagesArray.slice(0, lastAuthorIndex + 1);
    const recentMessages = filteredRecent100Messages.slice(-RECENT_MESSAGES_LIMIT);

    const userMessages = recent100Messages.filter(msg => msg.author.id === authorId);

    const generatedCurrentUserSummary = await generateCurrentUserSummary(client, message, filteredRecent100Messages, userMessages);
    const { generatedUsersConversationsSummary, usersConversations } = await generateUsersConversationsSummary(client, message, filteredRecent100Messages);
    const assembledCurrentConversationUsers = await MessageService.assembleCurrentConversationUsers(client, message, filteredRecent100Messages, usersConversations);

    const roles = UtilityLibrary.discordRoles(message.member);
    
    // const selfRoles = message.guild.members.cache.get(client.user.id).roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ');

    // ${news ? `# News Information` : ''}
    // ${news ? news : ''}
    // ${scrapedURL ? `# URL Information` : ''}
    // ${scrapedURL ? `## ${urls[0]}.` : ''}
    // ${scrapedURL ? `- Title: ${scrapedURL.title}.` : ''}
    // ${scrapedURL ? `- Description: ${scrapedURL.description}.` : ''}
    // ${scrapedURL ? `- Keywords: ${scrapedURL.keywords}.` : ''}
    // ${newsSummary}
    // ${trends}
    // Your traits, roles and descriptions: ${selfRoles}

    const mentionedUserContent = 
`# Users Mentioned`;

    let conversationSystemContent =
`# Your Information
Your name: ${client.user.displayName}
Your discord user ID: <@${client.user.id}>
${imagePrompt ? `Image that you've generated separately and is attached to your reply: ${imagePrompt}` : ''}`;

    if (userMentions) {
        conversationSystemContent += `\n\n${userMentions}`
    }

    if (userReply) {
        conversationSystemContent += `\n\n${userReply}`
    }

    conversationSystemContent += 
`\n\n${MessageService.assembleDateMessage()}

${MessageService.assembleServerInformation(message)}

${MessageService.assembleCurrentConversationUser(message)}
Topic of conversation: ${generatedCurrentUserSummary}`

    if (assembledCurrentConversationUsers) {
        conversationSystemContent += `\n\n${assembledCurrentConversationUsers}`
    }

    if (generatedUsersConversationsSummary) {
        conversationSystemContent += `\n\n${generatedUsersConversationsSummary}`
    }

    conversationSystemContent += 
`\n\n${MessageService.assembleAssistantMessage()}

${MessageService.assembleBackstoryMessage(message.guild?.id)}

${MessageService.assemblePersonalityMessage()}

${MessageService.assembleServerSpecificMessage(message.guild?.id)}`


    conversation.push({
        role: 'system',
        content: conversationSystemContent
    });

    UtilityLibrary.consoleInfo([[`📄 Conversation:`, { color: 'cyan' }, 'middle']]);

    console.log(conversation[0].content); // prints out the system message

    recentMessages.forEach((msg, index) => {
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
                content: `${msg.author.displayName ? UtilityLibrary.capitalize(msg.author.displayName) : UtilityLibrary.capitalize(msg.author.username)} said ${index === recentMessages.length - 1 ? message.content : msg.content}:`
            })
        }
    })
    
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
    // UtilityLibrary.consoleInfo([[`💡 News: `, { }], [response, { }, 'middle']]);
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
    UtilityLibrary.consoleInfo([[`💡 Topic: `, { }], [response, { }, 'middle']]);
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
//     UtilityLibrary.consoleInfo([[`📝 Image: `, { }], [{ prompt: text }, { }, 'middle']]);
//     return await ComfyUIWrapper.generateImage(text);
// }

const AIService = {
    async generateTextFromSystemUserMessages(systemMessage, userMessage, message) {
        const conversation = generateConversation(systemMessage, userMessage, message);
        return await generateText({ conversation, type: 'OPENAI', performance: 'FAST', tokens: 600 });
    },
    async generateTextResponse({ message, type, performance, tokens }, imagePrompt, userMentions, userReply) {
        UtilityLibrary.consoleInfo([[`🎨 generateTextResponse input:\n${message.content}`, { color: 'blue' }, 'middle']]);
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
            const conversation = await generateConversationFromRecentMessages(message, client, alerts, trends, news, imagePrompt, userMentions, userReply);
            let generatedText = await generateText({ conversation, type, performance, tokens });

            let notCapable = await generateNotCapableResponseCheck(message, generatedText);
            if (notCapable.toLowerCase() === 'yes' && imagePrompt) {
                UtilityLibrary.consoleInfo([[`🎨 generateTextResponse not capable: ${generatedText}`, { color: 'red' }, 'middle']]);
                generatedText = imagePrompt;
            }
            // const bannedWordsRegex = /:\w+:|beaner|[c0245][0-9]on|chink|f[\s.@]a[g]{1,2}[oi0]{1,2}t|m(?:[7-9]|10)g(?:[7-9]|10)t|f(?:[7-9]|10)g(?:[7-9]|10)|[gf][ao]int[rt]|fgt{2,3}rtd|fgt{2,3}|froc[i1]{2}aggine|g[0o]{2}k|honkey|https:\/\/imgur.com\/aRYkT2C|kike|kys|n![1ig]{1,3}3r|n!g{1,2}er|ni🅱️ 🅱️ a|ni[bg]{1,3}a|[ng][i1][g]{1,2}3r|n[ig]{3}a|[n3][i1][g6]{1,2}[3e]?[r]?|n[ig]{3}let|spic|tran{2,3}[iy]{1,2}|wetback|www.wowgoldgo.com/gi;
            // if (generatedText.match(bannedWordsRegex)) {
            //     UtilityLibrary.consoleInfo([[`📝 Text: generation failed because of regex`, { color: 'red' }, 'middle']]);
            //     return '...';
            // }
            UtilityLibrary.consoleInfo([[`🎨 generateTextResponse output:\n${generatedText}`, { color: 'green' }, 'middle']]);
            return generatedText;
        } catch (error) { 
            console.log(error)
            UtilityLibrary.consoleInfo([[`📝 generateTextResponse failed`, { color: 'red' }, 'middle']]);
            return;
        }
    },
    async generateTextResponseAnswer(conversation, textResponse) {
        UtilityLibrary.consoleInfo([[`📝 Text: response answer started`, { color: 'yellow' }, 'middle']]);
        UtilityLibrary.consoleInfo([[`📝 Text prompt:\n${textResponse}`, { color: 'blue' }, 'middle']]);
        try {
            let generatedText = await generateText({ conversation });
            
            UtilityLibrary.consoleInfo([[`📝 Text: response answer successful`, { color: 'green' }, 'middle']]);
            return generatedText;
        } catch (error) { 
            console.log(error)
            UtilityLibrary.consoleInfo([[`📝 Text: response answer failed`, { color: 'red' }, 'middle']]);
            return;
        }
    },
    async generateImagePrompt(message, imageToGenerate) {
        DiscordWrapper.setActivity(`🎨 Drawing for ${DiscordWrapper.getNameFromItem(message)}...`);
        const username = UtilityLibrary.discordUsername(message.author || message.member);
        const randomText = [
            `Always include written text that fits the theme of the image that says: "${username}".`,
            
        ]
        const pickRandomText = randomText[Math.floor(Math.random() * randomText.length)];
        UtilityLibrary.consoleInfo([[`🎨 generateImagePrompt input:\n${message.content}`, { color: 'blue' }, 'middle']]);
        let conversation = [
            {
                role: 'system',
                content: 
                `You are an expert at describing visual pieces of art, images, photographs, etc. You are a pro at generating text-to-image prompts for text-to-image models. You will generate a prompt for an image based on the text that is given to you.

                ${pickRandomText}
                
                Keep as much original details as possible. Do not include any additional text besides the prompt.
                Do not make self-referential comments or break the fourth wall.

                ${MessageService.assembleServerSpecificMessage(message.guild?.id)}`
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: 
`Make a clean prompt for image generation based on the following text, and assets provided: 

${message.content}`,
            }
        ]
        let imagePrompt = await generateText({ conversation, type: IMAGE_PROMPT_LANGUAGE_MODEL_TYPE, performance: IMAGE_PROMPT_LANGUAGE_MODEL_PERFORMANCE, tokens: IMAGE_PROMPT_LANGUAGE_MODEL_MAX_TOKENS })
        let notCapable = await generateNotCapableResponseCheck(message, imagePrompt);
        if (notCapable.toLowerCase() === 'yes') {
            UtilityLibrary.consoleInfo([[`🎨 generateImagePrompt not capable: ${imagePrompt}`, { color: 'red' }, 'middle']]);
            imagePrompt = imageToGenerate ? imageToGenerate : message.content;
        }
        UtilityLibrary.consoleInfo([[`🎨 generateImagePrompt output:\n${imagePrompt}`, { color: 'green' }, 'middle']]);
        return imagePrompt;
    },
    async createImagePromptFromImageAndText(message, imagePrompt, textResponse, imageToGenerate) {
        // DiscordWrapper.setActivity(`🎨 Drawing for ${DiscordWrapper.getNameFromItem(message)}...`);
        // const username = UtilityLibrary.discordUsername(message.author || message.member);
        // const randomText = [
        //     `Always include written text that fits the theme of the image that says: "${username}".`,
            
        // ]
        // const pickRandomText = randomText[Math.floor(Math.random() * randomText.length)];
        // UtilityLibrary.consoleInfo([[`🎨 Image message content:\n${message.content}`, { color: 'blue' }, 'middle']]);
        let conversation = [
            {
                role: 'system',
                content: `You are given two prompts; an image and text prompt. You will combine these two prompts into a single cohesive image prompt, while keeping the original details as much as possible. Do not omit any details from the visual image prompt, as this is the answer to the user's question.

                Visual image prompt: "${imagePrompt}".
                Descriptive text prompt: "${textResponse}".
                
                Keep as much original details as possible.
                Try to answer any questions that are asked in the text.
                Do not make self-referential comments or break the fourth wall.
                Do not answer with a question.`
            },
            {
                role: 'user',
                name: UtilityLibrary.getUsernameNoSpaces(message),
                content: `Combine these two prompts into a cohesive image prompt, while keeping the original details as much as possible.
                Prompt 1: ${imagePrompt}
                
                Prompt 2: ${textResponse}`,
            }
        ]
        let generatedImagePrompt = await generateText({ conversation, type: IMAGE_PROMPT_LANGUAGE_MODEL_TYPE, performance: IMAGE_PROMPT_LANGUAGE_MODEL_PERFORMANCE, tokens: IMAGE_PROMPT_LANGUAGE_MODEL_MAX_TOKENS })
        let notCapable = await generateNotCapableResponseCheck(message, generatedImagePrompt);
        if (notCapable.toLowerCase() === 'yes') {
            UtilityLibrary.consoleInfo([[`🎨 Image not capable 2: ${generatedImagePrompt}`, { color: 'red' }, 'middle']]);
            generatedImagePrompt = imageToGenerate ? imageToGenerate : message.content;
        }
        UtilityLibrary.consoleInfo([[`🎨 Image prompt 2 output:\n${generatedImagePrompt}`, { color: 'green' }, 'middle']]);
        return generatedImagePrompt;
    },
    async generateImage(imagePrompt) {
        try {
            await ComfyUIWrapper.checkWebsocketStatus();
            UtilityLibrary.consoleInfo([[`🎨 Image: generation started`, { color: 'yellow' }, 'middle']]);
            const generatedImage = await ComfyUIWrapper.generateImage(imagePrompt);
            UtilityLibrary.consoleInfo([[`🎨 Image: generation successful`, { color: 'green' }, 'middle']]);
            return generatedImage;
        } catch (error) {
            UtilityLibrary.consoleInfo([[`🎨 Image: generation failed`, { color: 'red' }, 'middle']]);
            return;
        }
    },
    async generateVoice(message, text) {
        DiscordWrapper.setActivity(`🗣️ Recording for ${DiscordWrapper.getNameFromItem(message)}...`);
        UtilityLibrary.consoleInfo([[`🔊 Audio: `, { }], [{ prompt: text }, { }, 'middle']]);
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
                    ${MessageService.assembleBackstoryMessage(message.guild?.id)}
                    ${MessageService.assemblePersonalityMessage()}
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
