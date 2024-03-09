const WebSocket = require('ws');
const crypto = require('crypto');
const clientId = crypto.randomBytes(20).toString('hex');

const {
    COMFY_UI_IMAGE_MODEL_API_URL,
    COMFY_UI_IMAGE_MODEL_WEBSOCKET_URL,
} = require('../config.json');

async function postPrompt(prompt) {
    try {
        const response = await fetch(`${COMFY_UI_IMAGE_MODEL_API_URL}/prompt`, {
            method: 'POST',
            body: JSON.stringify({ prompt: prompt, client_id: clientId }),
            headers: { 'Content-Type': 'application/json' },
        });
        return response.json();
    } catch (error) {
        return console.error('Error posting prompt:', error);
    }
}

async function getImage(filename, subfolder, folderType) {
    const params = new URLSearchParams({ filename, subfolder, type: folderType });
    const response = await fetch(`${COMFY_UI_IMAGE_MODEL_API_URL}/view?${params}`);
    return response.arrayBuffer(); // Use arrayBuffer for binary data
}

async function getHistory(promptId) {
    const response = await fetch(`${COMFY_UI_IMAGE_MODEL_API_URL}/history/${promptId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    return await response.json();
}

function calculatePeriodsIncreaseOverTime(periods = '') {
  // start with 1 period, then two, then three, and go back to one
  let periodsIncreaseOverTime = periods + '.';
  if (periodsIncreaseOverTime.length > 3) {
    periodsIncreaseOverTime = '.';
  }
  return periodsIncreaseOverTime;
  
}

async function generateImage(prompt) {
    try {
        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(`${COMFY_UI_IMAGE_MODEL_WEBSOCKET_URL}/ws?clientId=${clientId}`);
            websocket.onopen = async () => {
                try {
                    const { prompt_id: promptId } = await postPrompt(prompt);
                    const outputImages = {};

                    websocket.onmessage = async (event) => {
                        const message = JSON.parse(event.data);
                        if (message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
                            websocket.close();
                            const history = await getHistory(promptId);
                            const historyPromptId = history[promptId];
                            for (const node_id in historyPromptId.outputs) {
                                const nodeOutput = historyPromptId.outputs[node_id];
                                if ('images' in nodeOutput) {
                                    const imagesOutput = [];
                                    for (const image of nodeOutput.images) {
                                        const imageBuffer = await getImage(image.filename, image.subfolder, image.type);
                                        const base64Image = Buffer.from(imageBuffer).toString('base64');
                                        imagesOutput.push(base64Image);
                                    }
                                    outputImages[node_id] = imagesOutput;
                                }
                            }
                            resolve(outputImages);
                        }
                    };
                } catch (innerError) {
                    reject(innerError);
                }
            };

            websocket.onerror = (error) => {
                reject();
                // reject(new Error('WebSocket error: ' + error.message));
                // resolve({})
            };
        });
    } catch (error) {
        console.error('Error generating image:', error);
        throw error; // Rethrow or handle as needed.
    }
}

async function checkWebsocketStatus() {
    try {
        return new Promise((resolve, reject) => {
            const websocket = new WebSocket(`${COMFY_UI_IMAGE_MODEL_WEBSOCKET_URL}/ws?clientId=${clientId}`);
            websocket.onopen = () => {
                websocket.close();
                resolve();
            };
            websocket.onerror = (error) => {
                console.error('⚠️ ComfyUI Is Down: Cannot Generate Image');
                reject();
            };
        })
    } catch (error) {
        console.error('⚠️ ComfyUI Is Down: Cannot Generate Image');
        throw error;
    }
}

const prompt = {
  "3": {
    "inputs": {
      "seed": 687520558485300,
      "steps": 30,
      "cfg": 4,
      "sampler_name": "euler_ancestral",
      "scheduler": "simple",
      "denoise": 0.9,
      "model": [
        "30",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "latent_image": [
        "34",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "6": {
    "inputs": {
      "text": "a beautiful detailed image of an evil ghost wolf disguised as a ninja in the midst of Duskwood, its ethereal fur blending seamlessly with the shadows of the dark, enchanted forest. Equipped with ancient, ghostly ninja weaponry and glowing red eyes that pierce through the darkness, the wolf moves with supernatural agility and stealth. Around it, the mist of the night swirls, adding an air of mystique and danger. The scenery captures the ghost ninja wolf as it prepares to strike, embodying both the silent deadliness of a skilled assassin and the menacing aura of an otherworldly predator, under natural lighting, photography.",
      "clip": [
        "37",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "watermark, signature",
      "clip": [
        "37",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "33",
        0
      ],
      "vae": [
        "29",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "29": {
    "inputs": {
      "vae_name": "stage_a.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "30": {
    "inputs": {
      "unet_name": "stage_c.safetensors"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "UNETLoader"
    }
  },
  "32": {
    "inputs": {
      "unet_name": "stage_b.safetensors"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "UNETLoader"
    }
  },
  "33": {
    "inputs": {
      "seed": 294817137222856,
      "steps": 10,
      "cfg": 1.4,
      "sampler_name": "dpmpp_sde",
      "scheduler": "sgm_uniform",
      "denoise": 1,
      "model": [
        "32",
        0
      ],
      "positive": [
        "36",
        0
      ],
      "negative": [
        "40",
        0
      ],
      "latent_image": [
        "34",
        1
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "34": {
    "inputs": {
      "width": 1280,
      "height": 1024,
      "compression": 38,
      "batch_size": 1
    },
    "class_type": "StableCascade_EmptyLatentImage",
    "_meta": {
      "title": "StableCascade_EmptyLatentImage"
    }
  },
  "36": {
    "inputs": {
      "conditioning": [
        "40",
        0
      ],
      "stage_c": [
        "3",
        0
      ]
    },
    "class_type": "StableCascade_StageB_Conditioning",
    "_meta": {
      "title": "StableCascade_StageB_Conditioning"
    }
  },
  "37": {
    "inputs": {
      "clip_name": "model.safetensors",
      "type": "stable_cascade"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "Load CLIP"
    }
  },
  "40": {
    "inputs": {
      "conditioning": [
        "6",
        0
      ]
    },
    "class_type": "ConditioningZeroOut",
    "_meta": {
      "title": "ConditioningZeroOut"
    }
  },
  "43": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "mode": "lossy",
      "compression": 90,
      "images": [
        "8",
        0
      ]
    },
    "class_type": "Save_as_webp",
    "_meta": {
      "title": "Save_as_webp"
    }
  }
}

function createImagePromptFromText(text) {
    const fullPrompt = prompt
    if (text) {
        fullPrompt["3"]["inputs"]["seed"] = Math.floor(Math.random() * 1000000000000000);
        fullPrompt["33"]["inputs"]["seed"] = Math.floor(Math.random() * 1000000000000000);
        fullPrompt["6"]["inputs"]["text"] = text;
    }
    return fullPrompt
}

const ComfyUIWrapper = {
    async generateImage(text) {
        try {
            const prompt = createImagePromptFromText(text);
            const images = await generateImage(prompt);
            return images[43][0];
        } catch (error) {
            return console.error('⚠️ ComfyUI Is Down: Cannot Generate Image');
        }
    },
    checkWebsocketStatus: checkWebsocketStatus,
};


module.exports = ComfyUIWrapper;
