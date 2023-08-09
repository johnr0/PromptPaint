import torch
torch_device = "cuda" if torch.cuda.is_available() else "cpu"
from transformers import CLIPTextModel, CLIPTokenizer
from diffusers import AutoencoderKL, UNet2DConditionModel, PNDMScheduler

# 1. Load the autoencoder model which will be used to decode the latents into image space. 
vae = AutoencoderKL.from_pretrained("CompVis/stable-diffusion-v1-4", subfolder="vae", use_auth_token=True)

# 2. Load the tokenizer and text encoder to tokenize and encode the text. 
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-large-patch14")
text_encoder = CLIPTextModel.from_pretrained("openai/clip-vit-large-patch14")

# 3. The UNet model for generating the latents.
unet = UNet2DConditionModel.from_pretrained("CompVis/stable-diffusion-v1-4", subfolder="unet", use_auth_token=True)

from diffusers import DDIMScheduler

scheduler = DDIMScheduler(beta_start=0.00085, beta_end=0.012, beta_schedule="scaled_linear", clip_sample=False, set_alpha_to_one=False)

from torch import autocast
from tqdm.auto import tqdm
from PIL import Image

vae = vae.to(torch_device)
text_encoder = text_encoder.to(torch_device)
unet = unet.to(torch_device) 

embedded_text_prompts = {}

def text_prompt_embed(t):
  with torch.no_grad():
    if t in embedded_text_prompts:
      return embedded_text_prompts[t]
    else: 
      text_input = tokenizer([t], padding="max_length", max_length=tokenizer.model_max_length, truncation=True, return_tensors="pt")
      text_embeddings = text_encoder(text_input.input_ids.to(torch_device))[0]
      embedded_text_prompts[t] = text_embeddings
      return text_embeddings



from flask_socketio import SocketIO, emit
from flask import Flask, request
from flask_cors import CORS
from random import gauss, random
# from threading import Thread, Event
from time import sleep
import time

import numpy as np
from PIL import Image
import base64
from io import BytesIO
import torch
# from gevent.pywsgi import WSGIServer
# from geventwebsocket.handler import WebSocketHandler

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*')
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/hello')
def hello():
    return "Hello World!"


# Handle the webapp connecting to the websocket
@socketio.on('connect')
def test_connect():
    print('someone connected to websocket:', request.sid)
    emit('connect', {'data': 'Connected! ayy'})
    
@socketio.on('disconnect')
def test_connect():
    print(request.sid)
    print('someone disconnected to websocket')
    emit('disconnect', {'data': 'Disconnected! ayy'})

# Handle the webapp connecting to the websocket, including namespace for testing
@socketio.on('connect', namespace='/devices')
def test_connect2():
    print('someone connected to websocket!')
    emit('responseMessage', {'data': 'Connected devices! ayy'})


def preprocess_mask(mask):
    mask = mask.convert("L")
    w, h = mask.size
    if w < h:
      w = 512
      h = int(h*(512/w))
    else:
      h = 512
      w = int(w*(512/h))

    # if w > 512:
    #   h = int(h * (512/w))
    #   w = 512
    # if h > 512:
    #   w = int(w*(512/h))
    #   h = 512
    
    w, h = map(lambda x: x - x % 64, (w, h)) 
    w //= 8
    h //= 8

    mask = mask.resize((w, h), resample=Image.LANCZOS)

    mask = np.array(mask).astype(np.float32) / 255.0
    mask = np.tile(mask, (4,1,1))
    mask = mask[None].transpose(0,1,2,3)
    mask[np.where(mask !=0.0)]=1.0
    mask = torch.from_numpy(mask)
    return mask

def preprocess(image):
    image = image.convert('RGB')
    w, h = image.size
    if w < h:
      w = 512
      h = int(h*(512/w))
    else:
      h = 512
      w = int(w*(512/h))
    # if w > 512:
    #   h = int(h * (512/w))
    #   w = 512
    # if h > 512:
    #   w = int(w*(512/h))
    #   h = 512
    w, h = map(lambda x: x - x % 64, (w, h))  # resize to integer multiple of 64, 32 can sometimes result in tensor mismatch errors

    image = image.resize((w, h), resample=Image.LANCZOS)
    print(image.size)
    image = np.array(image).astype(np.float32) / 255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)
    return 2.0 * image - 1.0

def numpy_to_pil(images):
    """
    Convert a numpy image or a batch of images to a PIL image.
    """
    if images.ndim == 3:
            images = images[None, ...]
    images = (images * 255).round().astype("uint8")
    pil_images = [Image.fromarray(image).convert('RGBA') for image in images]
    return pil_images

@socketio.on('test')
def handle_message_t(message):
    print(message)

@socketio.on('gen_step')
@torch.no_grad()
def handle_message(message):
    # print(request.sid)
    # print('someone sent to the websocket', message)
    # print(message.keys())
    # print('gen??')
    now = time.time()

    guidance_scale = message['guidance_scale']
    text_prompts = message['text_prompts']
    text_prompt_weights = message['text_prompt_weights']
    directional_prompts = message['directional_prompts']

    layer_img_o = Image.open(BytesIO(base64.b64decode(message['layer_img'].split(",",1)[1])))
    area_img = Image.new("RGBA", layer_img_o.size, "WHITE")
    area_img_o = Image.open(BytesIO(base64.b64decode(message['area_img'].split(",",1)[1])))
    area_img.paste(area_img_o, (0,0), area_img_o)
    


    overcoat_ratio = message['overcoat_ratio']
    seed = message['seed']
    generator = torch.Generator(device='cuda')
    generator.manual_seed(seed) 

    # set mask from area_img
    area_mask = preprocess_mask(area_img)
    area_mask = area_mask.to(torch_device)

    # add black or white background to the layer image
    layer_img_back = Image.new("RGBA", layer_img_o.size, "WHITE")
    layer_img_back.paste(layer_img_o, (0, 0), layer_img_o)
    layer_img_back.convert('RGB')
    layer_img = preprocess(layer_img_back)
    # layer_img = layer_img_o.convert('RGB')
    # layer_img = preprocess(layer_img)
    init_latents = vae.encode(layer_img.to(torch_device)).sample()
    init_latents = 0.18215 * init_latents

    noise = torch.randn(init_latents.shape, generator=generator, device=torch_device)

    
    num_inference_steps = message['steps']
    t = scheduler.timesteps[message['gen_tick']]
    print(message['gen_tick'], t)

    if message['gen_tick'] < int((1-overcoat_ratio)*num_inference_steps):
      layer_array = np.copy(np.asarray(layer_img_o))

      alphas = np.ones(layer_array[:,:,3,None].shape)*255
      layer_array = np.concatenate((layer_array[:,:,3,None], layer_array[:,:,3,None], layer_array[:,:,3,None], alphas), axis = 2)
      layer_array = np.array(layer_array, dtype = np.uint8)
  
      layer_img_mask = Image.fromarray(layer_array)
      layer_mask = preprocess_mask(layer_img_mask)
      layer_mask = layer_mask.to(torch_device)


    
    if message['gen_tick']==0:   
      
      # latents = noise # start from the purse noise

      latents = (1-area_mask)* (1-layer_mask) * noise + (1-(1-area_mask)* (1-layer_mask)) * init_latents # In / Out
      latents = (0.1) * latents + 0.9 * noise
      
      # scheduler.add_noise(latents, noise, t-1)
    else:
      # print('stored latent is used')
      latents = torch.Tensor(message['latents'])
      latents = latents.to(torch_device)


    # print(latents.size())


    print(time.time()-now)

    # set directional prompt embeddings
    directional_vector = None
    for directional_prompt in directional_prompts:
      if directional_vector == None:
        directional_vector = float(directional_prompt['value'])/100.0 * (text_prompt_embed(directional_prompt['promptB'])-text_prompt_embed(directional_prompt['promptA']))
      else:
        directional_vector = directional_vector + float(directional_prompt['value'])/100.0 * (text_prompt_embed(directional_prompt['promptB'])-text_prompt_embed(directional_prompt['promptA']))

    # set prompts
    # text_input = tokenizer(text_prompts, padding="max_length", max_length=tokenizer.model_max_length, truncation=True, return_tensors="pt")
  
    # with torch.no_grad():
    #   text_embeddings = text_encoder(text_input.input_ids.to(torch_device))[0]
    #   prompt_weights = torch.Tensor(text_prompt_weights).to(torch_device)
    #   text_embeddings = torch.sum(text_embeddings * prompt_weights[:, None, None], dim=0)/torch.sum(prompt_weights)


    # handle text input
    # text_input = tokenizer(text_prompts, padding="max_length", max_length=tokenizer.model_max_length, truncation=True, return_tensors="pt")
    
    # with torch.no_grad():
    #   text_embeddings = text_encoder(text_input.input_ids.to(torch_device))[0]
    # prompt_weights = None
    # if prompt_weights == None:
    #   text_embeddings = torch.mean(text_embeddings, dim=0)
    # else:
    #   prompt_weights = torch.Tensor(prompt_weights).to(torch_device)
    #   text_embeddings = torch.sum(text_embeddings * prompt_weights[:, None, None], dim=0)/torch.sum(prompt_weights)
    # text_embeddings = text_embeddings.reshape(1, text_embeddings.shape[0], text_embeddings.shape[1])

    # max_length = text_input.input_ids.shape[-1]
    # uncond_input = tokenizer(
    #     [""], padding="max_length", max_length=max_length, return_tensors="pt"
    # )
    # with torch.no_grad():
    #   uncond_embeddings = text_encoder(uncond_input.input_ids.to(torch_device))[0]  

    # text_embeddings = torch.cat([uncond_embeddings, text_embeddings])
    
    text_prompt_embedding = None
    tpw = 0
    for tp_idx, text_prompt in enumerate(text_prompts):
      # print('inloop1', time.time()-now)
      cur_embedding = text_prompt_embed(text_prompt)
      # print('inloop2', time.time()-now)
      if text_prompt_embedding==None:
        text_prompt_embedding = cur_embedding*text_prompt_weights[tp_idx]
      else:
        text_prompt_embedding = text_prompt_embedding + cur_embedding*text_prompt_weights[tp_idx]
      tpw = tpw + text_prompt_weights[tp_idx]
      # print('inloop3', time.time()-now)
    text_prompt_embedding = text_prompt_embedding/tpw

    uncond_embeddings = text_prompt_embed('')
    text_embeddings = torch.cat([uncond_embeddings, text_prompt_embedding])
    # print(uncond_embeddings.size(), text_prompt_embedding.size())

    print(time.time()-now)

    
    scheduler.set_timesteps(num_inference_steps)
    # Do something about generation
    latent_model_input = torch.cat([latents] * 2)
    # predict the noise residual
    with torch.no_grad():
      noise_pred = unet(latent_model_input, t, encoder_hidden_states=text_embeddings)["sample"]

    # perform guidance
    noise_pred_uncond, noise_pred_text = noise_pred.chunk(2)
    
    noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond)
    latents = scheduler.step(noise_pred, t, latents)["prev_sample"]

    # t_noise = torch.randn(latents.shape, device=torch_device)
    if t > 1:
      # when over overcoat ratio
      if message['gen_tick'] >= int((1-overcoat_ratio)*num_inference_steps):
        init_latents_proper = scheduler.add_noise(init_latents, noise, t-1)
        latents = init_latents_proper * area_mask    +    latents * (1-area_mask)
      else:
        init_latents_proper = scheduler.add_noise(init_latents, noise, t-1)
        # latents = init_latents_proper * area_mask    +    latents * (1-area_mask)
        latents = (1-area_mask)* (1-layer_mask) * latents + (1-(1-area_mask)* (1-layer_mask)) * init_latents_proper # In / Out
        # latents = (1-area_mask)* (1-layer_mask) * latents + area_mask * init_latents_proper + (layer_mask*(1-area_mask)*(latents+init_latents_proper)*0.5) # In / Out
        
      # when below overcoat ratio
    else:
      latents = init_latents * area_mask    +    latents * (1-area_mask)

    # latents = (1-area_mask) * latents + area_mask * init_latents




    print(time.time()-now)
    # mask 
    # latents = area_mask * init_latents + (1-area_mask) * latents
    latents_rt = latents.cpu().detach().numpy().tolist()

    latents = 1 / 0.18215 * latents
    
    output_img = vae.decode(latents)
    print('within', time.time()-now)
    output_img = (output_img / 2 + 0.5).clamp(0, 1)
    print('within2-1', time.time()-now)
    output_img = output_img.permute(0, 2, 3, 1)
    print('within2-1-1', time.time()-now)
    torch.cuda.synchronize()
    now2 = time.time()
    output_img = output_img.cpu()
    print('within2-1-2', time.time()-now, time.time()-now2)
    output_img = output_img.numpy()
    # output_img = output_img.cpu().permute(0, 2, 3, 1).numpy()
    print('within2-2', time.time()-now)
    output_img = numpy_to_pil(output_img)[0]
    print('within2-3', time.time()-now)
    output_img = output_img.resize((layer_img_o.size[0], layer_img_o.size[1]), resample=Image.LANCZOS)
    print('within2', time.time()-now)
    output_array = np.asarray(output_img)
    output_array = np.copy(output_array)
    # print('within3', time.time()-now)

    area_array = np.asarray(area_img_o)
    area_array = np.where(area_array==255, 255, 0)
    # print(area_array.shape, gaussian.shape)
    output_array[:,:,3] = area_array[:,:,3]
    # print('within4', time.time()-now)
    output_img = Image.fromarray(output_array)
    # print('within5', time.time()-now)
    
    # print('here?')
    buffered = BytesIO()
    output_img.save(buffered, format="PNG")
    output_img_send = base64.b64encode(buffered.getvalue()).decode("utf-8")

    print(time.time()-now, time.time())
    print('---------------------')
    emit('gen_done', {'data':message['area_img'].split(",",1)[0]+','+output_img_send, 'stroke_id': message['stroke_id'], 'latents':latents_rt})


# Handle the webapp sending a message to the websocket, including namespace for testing
@socketio.on('message', namespace='/devices')
def handle_message2():
    print('someone sent to the websocket!')


@socketio.on_error_default  # handles all namespaces without an explicit error handler
def default_error_handler(e):
    print('An error occured:')
    print(e)
    socketio.stop()


# if __name__ == '__main__':
socketio.run(app, host='0.0.0.0', debug=False, port=5001)
  # http_server = WSGIServer(('',5001), app, handler_class=WebSocketHandler)
  # http_server.serve_forever()
