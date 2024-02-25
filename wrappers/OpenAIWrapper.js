require('dotenv/config');
const { OpenAI } = require('openai');
const {
    GPT_RESPONSE_TEMPERATURE,
    GPT_RESPONSE_MAX_TOKENS,
    GPT_RESPONSE_MODEL,
    GPT_VISION_MODEL,
    GPT_VOICE_MODEL,
    GPT_VOICE_VOICE,
    GPT_VOICE_SPEED,
    GPT_VISION_MAX_TOKENS,
    OPENAI_KEY
} = require('../config.json');

const openai = new OpenAI({apiKey: OPENAI_KEY})

const OpenAIWrapper = {
    async generateFunctionResponse(customFunction, customFunctionName) {
        const messages = [{ role: "user", content: "What's the weather like in San Francisco, Tokyo, and Paris?" }];
        const tools = [
            {
            type: "function",
            function: {
                name: "get_current_weather",
                description: "Get the current weather in a given location",
                parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The city and state, e.g. San Francisco, CA",
                    },
                    unit: { type: "string", enum: ["celsius", "fahrenheit"] },
                },
                required: ["location"],
                },
            },
            },
        ];

        let response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });
      
        let response_message = response.data.choices[0].message;
        
        let tool_calls = response.data.choices[0].tool_calls;
        if (tool_calls) {
          messages.push(response_message);
          const available_functions = {
            "get_current_weather": get_current_weather,
          };
          
          for (let tool_call of tool_calls) {
            let functionName = tool_call.function.name;
            let functionToCall = available_functions[functionName];
            let functionArgs = JSON.parse(tool_call.function.arguments);
            let functionResponse = functionToCall(functionArgs.location, functionArgs.unit);
            messages.push({
              tool_call_id: tool_call.id,
              role: "tool",
              name: functionName,
              content: functionResponse,
            });
          }
          let second_response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
          });
          return second_response;
        }

    },
    async generateAudioResponse(text) {
        const response = await openai.audio.speech.create({
            model: GPT_VOICE_MODEL,
            voice: GPT_VOICE_VOICE,
            speed: GPT_VOICE_SPEED,
            input: text,
          }).catch((error) => console.error('OpenAI Error:\n', error));
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer;
    },
    async generateVisionResponse(imageUrl, text) {
        const response = await openai.chat.completions.create({
            model: GPT_VISION_MODEL,
            messages: [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": text ? text : "What’s in this image?" },
                        {
                            "type": "image_url",
                            "image_url": {
                            "url": imageUrl,
                            },
                        },
                    ],
                }
            ],
            max_tokens: GPT_VISION_MAX_TOKENS,
        }).catch((error) => console.error('OpenAI Error:\n', error));
        return response;
    },
    async generateResponse(conversation, tokens, model = GPT_RESPONSE_MODEL) {
        return await openai.chat.completions.create({
            temperature: GPT_RESPONSE_TEMPERATURE,
            model: model,
            messages: conversation,
            max_tokens: tokens ? tokens : GPT_RESPONSE_MAX_TOKENS,
        }).catch((error) => console.error('OpenAI Error:\n', error));
    }
};

module.exports = OpenAIWrapper;
