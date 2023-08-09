from flask_socketio import SocketIO, emit
from flask import Flask, request
from flask_cors import CORS
from random import gauss, random
from threading import Thread, Event
from time import sleep


import numpy as np
from PIL import Image
import base64
from io import BytesIO
import torch


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
    if w > 512:
      h = int(h * (512/w))
      w = 512
    if h > 512:
      w = int(w*(512/h))
      h = 512
    
    w, h = map(lambda x: x - x % 8, (w, h)) 
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
    w, h = image.size
    if w > 512:
      h = int(h * (512/w))
      w = 512
    if h > 512:
      w = int(w*(512/h))
      h = 512
    w, h = map(lambda x: x - x % 8, (w, h))  # resize to integer multiple of 64, 32 can sometimes result in tensor mismatch errors

    image = image.resize((w, h), resample=Image.LANCZOS)
    print(image.size)
    image = np.array(image).astype(np.float32) / 255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)
    return 2.0 * image - 1.0


@socketio.on('gen_step')
def handle_message(message):
    # print(request.sid)
    # print('someone sent to the websocket', message)
    # print(message.keys())

    area_img = Image.open(BytesIO(base64.b64decode(message['area_img'].split(",",1)[1])))
    layer_img = Image.open(BytesIO(base64.b64decode(message['layer_img'].split(",",1)[1])))

    layer_img_back = Image.new("RGBA", layer_img.size, "WHITE")
    layer_img_back.paste(layer_img, (0, 0), layer_img)
    layer_img_back.convert('RGB')

    overcoat_img = None
    if 'overcoat_img' in message:
        overcoat_img = Image.open(BytesIO(base64.b64decode(message['overcoat_img'].split(",",1)[1])))
    overcoat_ratio = message['overcoat_ratio']
    
    guidance_scale = message['guidance_scale']
    text_prompts = message['text_prompts']
    text_prompt_weights = message['text_prompt_weights']
    directional_prompts = message['directional_prompts']

    # if overcoat image exists, add overcoat noise to the layer image
    if overcoat_img!=None:
        print('overcoating...')
        overcoat_img = preprocess_mask(overcoat_img)


    # add black or white background to the layer image


    # set mask from area_img
    area_img = preprocess_mask(area_img)
    layer_img = preprocess(layer_img_back)

    print(layer_img.shape)


    # set directional prompt embeddings

    # set prompts




    # for testing-gaussian
    gaussian = np.random.random((area_img.height, area_img.width, 1))*255
    gaussian4 = np.ones((area_img.height, area_img.width, 1))*255
    gaussian = np.concatenate((gaussian, gaussian, gaussian, gaussian4), axis = 2)
    result = np.array(gaussian, dtype = np.uint8)
    

    area_array = np.asarray(area_img)
    # print(area_array.shape, gaussian.shape)
    result[:,:,3] = area_array[:,:,3]

    result = Image.fromarray(result)
    # print('here?')
    buffered = BytesIO()
    result.save(buffered, format="PNG")
    result_img = base64.b64encode(buffered.getvalue()).decode("utf-8")

    emit('gen_done', {'data':message['area_img'].split(",",1)[0]+','+result_img, 'stroke_id': message['stroke_id']})


# Handle the webapp sending a message to the websocket, including namespace for testing
@socketio.on('message', namespace='/devices')
def handle_message2():
    print('someone sent to the websocket!')


@socketio.on_error_default  # handles all namespaces without an explicit error handler
def default_error_handler(e):
    print('An error occured:')
    print(e)

if __name__ == '__main__':
    socketio.run(app, debug=False, host='0.0.0.0', port=5001)
    print('run server...')
    # http_server = WSGIServer(('',5000), app, handler_class=WebSocketHandler)
    # http_server.serve_forever()
