const serverAddress = "127.0.0.1:8188";
// const clientId = randomUUID();
const WebSocket = require('ws');
const crypto = require('crypto');
const clientId = crypto.randomBytes(20).toString('hex');

async function queuePrompt(prompt) {
    const response = await fetch(`http://${serverAddress}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ prompt: prompt, client_id: clientId }),
        headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
}

async function getImage(filename, subfolder, folderType) {
    const params = new URLSearchParams({ filename, subfolder, type: folderType });
    const response = await fetch(`http://${serverAddress}/view?${params}`);
    return response.arrayBuffer(); // Use arrayBuffer for binary data
}

async function getHistory(promptId) {
    const response = await fetch(`http://${serverAddress}/history/${promptId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    return await response.json();
}

async function getImages(prompt) {
    const websocket = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);
    const { prompt_id: promptId } = await queuePrompt(prompt);
    const outputImages = {};

    return new Promise((resolve, reject) => {
        websocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'executing') {
                const data = message.data;
                if (data.node === null && data.prompt_id === promptId) { // this is how we know that it's done rendering
                    websocket.close();
                    const history = await getHistory(promptId);
                    const historyPromptId = history[promptId];
                    for (const node_id in historyPromptId.outputs) {
                        const nodeOutput = historyPromptId.outputs[node_id];
                        if ('images' in nodeOutput) {
                            const imagesOutput = [];
                            for (const image of nodeOutput.images) {
                                const imageBuffer = await getImage(image.filename, image.subfolder, image.type);
                                // Convert buffer to base64
                                const base64Image = Buffer.from(imageBuffer).toString('base64');
                                imagesOutput.push(base64Image);
                            }
                            outputImages[node_id] = imagesOutput;
                        }
                    }
                    resolve(outputImages);
                }
            }
        };

        websocket.onerror = (error) => {
            reject(error);
        };
    });
}

const prompt = {
  "3": {
    "inputs": {
      "seed": 687520558485300,
      "steps": 20,
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
      "steps": 5,
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
      "width": 1536,
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

// Modify the prompt as necessary before using it
// prompt["6"]["inputs"]["text"] = "masterpiece best quality man";
// prompt["3"]["inputs"]["seed"] = 5;

const ComfyUILibrary = {
    generateImagePrompt(message) {
        const fullPrompt = prompt
        if (message) {
            fullPrompt["3"]["inputs"]["seed"] = Math.floor(Math.random() * 1000000000000000);
            fullPrompt["33"]["inputs"]["seed"] = Math.floor(Math.random() * 1000000000000000);
            fullPrompt["6"]["inputs"]["text"] = message;
        }
        return fullPrompt
    },
    instantiateWebSocket() {
        const websocket = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);
        return websocket;
    },
    async getTheImages(prompt) {
        try {
            const images = await getImages(prompt);
            return images[43][0];
        } catch (error) {
            console.error(error);
        }
    }
};


module.exports = ComfyUILibrary;
