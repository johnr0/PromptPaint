import React from 'react'
import CanvasBody from './canvas_body'
import LayerController from './layer_controller'
import MainController from './main_controller'
// import SketchpadUndo from './sketchpad_undo'
import PromptController from './prompt_controller'
import AIDrawCanvas from './AI_draw_canvas'
import { e, i, rightArithShift } from 'mathjs'
import GenerationController from './generation_controller'
import axios from 'axios'


class Canvas extends React.Component {
    state = {
        ...this.state,
        boardname:'sketchpad',
        control_state: 'AI',
        action: 'idle',
        client_id:  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        //control_state --> area, move, brush, erase, content_stamp, style_stamp
        // action --> move: idle, move_board
        //            brush: idle, brush
        boardcenter: [0.2,  1.2], // the view of the board
        boardzoom: 0.4,
        boardlength:0, 

        boardheight: 0,
        boardwidth: 0,

        pixelwidth: 512,
        pixelheight: 512,

        // variables about moving board
        move_board_init: undefined,
        move_board_mouse_init: undefined,

        brush_cur: undefined, 
        brush_size: 20,
        brush_img: undefined, 
        brush_color: '#000000',
        cur_colored_brush_img: undefined,

        brush_pre_canvas: undefined, 

        erase_size: 20,

        stamp_size: 40,
        stamp_blur: 0.5, 

        layers: [
            {
                layer_id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                image: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
                opacity: 1,
                choosen_by:'',
                hidden: false,
            }
        ],
        layer_dict: {},

        sketchundo: [],
        current_layer: 0,

        lasso: [],
        lasso_img: undefined, 
        nonlasso_ret: undefined, 

        // below used for move-layer
        lassoed_canvas: undefined,
        unlassoed_canvas: undefined,

        move_layer_init_pos: undefined,
        adjust_pre_canvas: undefined, 
        init_lasso: undefined, 

        init_nonlasso_ret: undefined,

        lasso_rot_deg: 0,

        lasso_resize_direction: undefined,
        resize_layer_init_pos: undefined, 
        resize_ret: undefined, 

        prev_shift_key: 'move', 

        shift_pressed: false, 
        control_pressed:false,

        content_stamp_img: undefined, 
        content_stamp_ratio: undefined,
        content_stamp_init_pos: undefined,
        content_stamp_cur_pos: undefined,

        cur_mouse_pos: [0,0],

        undo_states: [],
        redo_states: [],

        // prompt relevant
        prompts: [
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     prompt: 'white sheep on a plain',
            //     position: [0.2,0.1],
            //     color: '#ffeeee',
            //     istext:true

            // },
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     prompt: 'black sheep wall',
            //     position: [0.5,0.5],
            //     color: '#333333',
            //     istext:true

            // },
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     prompt: 'oil painting',
            //     position: [0.7,0.3],
            //     color: '#8888ff',
            //     istext:true

            // },
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     prompt: 'a glowing outerplanet tower made of diamonds with mint color sunset behind, high resolution, rendered with unreal4, 4k, trending in art station',
            //     position: [0.8,0.9],
            //     color: '#a9e1ee',
            //     istext:true

            // },
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     prompt: 'dystopian tower',
            //     position: [0.8,0.8],
            //     color: '#3445a9',
            //     istext:true

            // }
        ],
        prompt_groups: [
            // [0, 1, 2], [3, 4]
        ],
        directional_prompts: [
            // {
            //     _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            //     promptA: 'rough',
            //     colorA: '#ffaaaa',
            //     promptB: 'flat',
            //     colorB: '#aaffaa',
            //     isAtext: true,
            //     isBtext: true,
            //     value: 0,
            // }
        ],
        AI_brush_mode: 'draw',
        AI_brush_size: 100,
        selected_prompt: undefined,
        guidance_scale: 7,
        single_stroke_ratio: 100,
        gen_steps: 20,
        overcoat_ratio: 70, 
        multi_strokes:false,
        gen_tick: -1,
        ratioData: {},
        AI_stroke_tables: {},
        AI_stroke_id: -1, 
        AI_intermediate_objs: {}, 

        undo_prompts: false,
    }

    AIDrawCanvas = React.createRef()
    PromptController = React.createRef()
    // TODO lasso tool - nonlasso-based resize

    componentDidUpdate(){
        // console.log(this.state.AI_intermediate_objs)
    }

    componentDidMount(){
        if(document.getElementById(this.state.boardname)!=undefined){
            this.setboardlength()
            window.addEventListener('resize', this.setboardlength.bind(this))
        }

        var checkerboard_el = document.getElementById('checkerboard')
        var checkerboard_canvas = checkerboard_el.getContext('2d')
        for(var i=0; i<this.state.pixelwidth; i+=10){
            for(var j=0; j<this.state.pixelheight; j+=10){
                if((i/10+j/10)%2==0){
                    checkerboard_canvas.rect(i, j, 10, 10)
                    checkerboard_canvas.fillStyle='#eeeeee'
                    checkerboard_canvas.fill()
                }
                
            }
        }

        var brush_img = new Image();
        // brush_img.crossOrigin="Anonymous"
        brush_img.src = window.location.protocol+'//'+window.location.host+'/img/circle.png';

        console.log(brush_img)
        this.setState({brush_img})

        var _this = this
        document.addEventListener('keydown', function(e){
            e = e||window.event;
            console.log(e.key)
            if(e.key=="z"){
                if(_this.state.control_pressed){
                    e.preventDefault();
                    if(_this.state.shift_pressed){
                        _this.redo()
                    }else{
                        _this.undo()
                    }
                }   
            }else if(e.key=='Control'){
                
            }else if(e.key=='Shift'){
                _this.setState({shift_pressed:true})
            }else if(e.key=='Meta'){
               
                _this.setState({control_pressed:true})
            }else if(e.key=='Alt'){
                _this.setState({multi_strokes:true})
                // if(_this.state.current_layer>=0){
                //     if(_this.state.layers[_this.state.current_layer].hide!=true){
                //         if(_this.state.action=='idle'&&_this.state.control_state!='move'){
                //             _this.setState({prev_shift_key: _this.state.control_state, control_state: 'move'})
                //         }
                //     }
                // }
            }else if(e.key=='Escape'){
                var el = document.getElementById('AI_area_canvas')
                var ctx = el.getContext('2d');
                ctx.clearRect(0,0,_this.state.pixelwidth, _this.state.pixelheight)
                _this.setState({action:'idle', stroke_id:undefined, brush_cur:undefined, AI_cur_colored_brush_img: undefined, AI_brush_pre_canvas: undefined, AI_origin_image: undefined})
            }
        })

        console.log(this.state.layers)

        document.addEventListener('keyup', function(e){
            e = e||window.event;
            if(e.key=="Alt"){
                _this.setState({multi_strokes:false}, function(){
                    if(_this.state.current_layer==-1 || _this.state.selected_prompt==undefined || _this.state.stroke_id==undefined){
                        return
                    }
                    if(_this.state.AI_brush_mode=='draw'){
                        _this.AIDrawCanvas.current.initGen2(0);
                    }else if(_this.state.AI_brush_mode=='erase'){
                        _this.AIDrawCanvas.current.genRemovePart();
                    }
                    
                })

                // if(_this.state.current_layer>=0){
                //     if(_this.state.layers[_this.state.current_layer].hide!=true){
                //         _this.setState({control_state: _this.state.prev_shift_key, action: 'idle'})
                //     }
                // }
            }else if(e.key==''){
                
            }else if(e.key=='Shift'){
                _this.setState({shift_pressed:false})
            }else if(e.key=='Meta'){
                _this.setState({control_pressed:false})

                
            }
        })

        var user = this.gup('user')
        if(user===null){
            user = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        }
        this.setState({user}, () => {
            if(user.includes('tutorial')){
                this.setTutorial(user)
            }else{
                this.getUserData(user)
            }
            
            
        })
    }

    setTutorial(user){
        if(user.includes('interpolation')){
            var prompts = [{
                    _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    prompt: 'an oil painting of elephant',
                    position: [0.2,0.1],
                    color: '#ffeeee',
                    istext:true
    
                },
                {
                    _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    prompt: 'an oil painting of rhinoceros',
                    position: [0.5,0.5],
                    color: '#333333',
                    istext:true
    
                }]
            this.setState({prompts})

        }else if(user.includes('directional')){
            var prompts = [{
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a modern clay art',
                position: [0.2,0.1],
                color: '#ffeeee',
                istext:true
            }]

            var directional_prompts = [{
                    _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    promptA: 'chaotic',
                    colorA: '#ffaaaa',
                    promptB: 'peaceful',
                    colorB: '#aaffaa',
                    isAtext: true,
                    isBtext: true,
                    value: 0,
            }]

            this.setState({prompts, directional_prompts})

        }else if(user.includes('switching')){
            var prompts = [{
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a banana on the ground',
                position: [0.2,0.1],
                color: '#ffeeee',
                istext:true

            },
            {
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a commercial photo of a futuristic car',
                position: [0.5,0.5],
                color: '#333333',
                istext:true

            }]
            this.setState({prompts})
        }else if(user.includes('stencil')){
            var prompts = [{
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a photo of mountain with trees',
                position: [0.2,0.1],
                color: '#ffeeee',
                istext:true

            },
            {
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a photo of a medieval tower',
                position: [0.5,0.5],
                color: '#333333',
                istext:true

            },
            {
                _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                prompt: 'a photo of a blue sky',
                position: [0.6,0.3],
                color: '#830284',
                istext:true

            }]
            this.setState({prompts})
        }
    }

    getUserData(user){
        var _this = this
        axios.post('http://localhost:5000/api/retrieveLatest', {user:user})
        .then((response)=>{
            console.log(response.data)
            this.setState(response.data['result'], ()=>{
                // TODO recover layers... 
                var layers = this.state.layers
                for(var i in layers){
                    console.log(i)
                    var layer = layers[i]
                    var canvas = document.getElementById('sketchpad_canvas_'+layer.layer_id)
                    var ctx = canvas.getContext('2d')
                    var img = new Image;
                    img.ctx = ctx
                    img.onload = function(){
                        console.log(this )
                        this.ctx.drawImage(this, 0, 0)
                    }
                    img.src = layer.image
                }
                for(var i in this.state.prompts){
                    var el = document.getElementById('prompt_'+this.state.prompts[i]._id)
                    el.style.height = 0
                    el.style.height = (el.scrollHeight+1)+'px'
                }
                // setInterval(this.storeWholeState.bind(this), 10000)
            })
        }).catch((error)=>{
            // setInterval(this.storeWholeState.bind(this), 10000)
        })
    }

    gup( name, url ) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( url );
        return results == null ? null : results[1];
    }

    storeCurrentState(action=''){
        axios.post('http://localhost:5000/api/storeEvent', {user:this.state.user, action})
    }

    storeWholeState(action=''){
        if(window.confirm('Do you want to store the current state of canvas?')){
            axios.post('http://localhost:5000/api/storeState', {user:this.state.user, c_state:this.state}, {maxContentLength: Infinity})
        }
        
    }

    setboardlength(){
        var boardwidth = document.getElementById(this.state.boardname).offsetWidth
        var boardheight = document.getElementById(this.state.boardname).offsetHeight
        var boardlength = (boardwidth>boardheight)?boardheight:boardwidth
        var outer_width  = boardwidth
        var outer_height = boardheight
        boardwidth = (boardwidth>boardheight)?boardwidth:boardheight/this.state.pixelheight*this.state.pixelwidth
        boardheight = (boardwidth<boardheight)?boardheight:boardwidth/this.state.pixelwidth*this.state.pixelheight
        
        console.log(boardlength)
        this.setState({boardlength:boardlength, boardheight:boardheight, boardwidth: boardwidth, outer_width:outer_width, outer_height: outer_height})
    }

    zoom_board_wheel(e){
        // console.log(e.deltaY)
        if(this.state.action=='idle'){
            var boardzoom_new = this.state.boardzoom-e.deltaY/100
            if(boardzoom_new<0.1){
                this.setState({boardzoom: 0.1})
            }else if(boardzoom_new>10){
                this.setState({boardzoom: 10})
            }else{
                this.setState({boardzoom: boardzoom_new})
            }
        }    
    }

    

    moveMouse(e){
            // console.log(this.state.move_board_init, this.state.move_board_mouse_init)
            // console.log(this.state.move_board_init[0]-(e.pageX-this.state.move_board_mouse_init[0])/100/this.state.boardzoom)
            var boardX = this.state.move_board_init[0]-(e.pageX-this.state.move_board_mouse_init[0])/this.state.outer_width/this.state.boardzoom
            var boardY = this.state.move_board_init[1]-(e.pageY-this.state.move_board_mouse_init[1])/this.state.outer_width/this.state.boardzoom
            // if (boardX<0.1){
            //     boardX = 0.1
            // }else if(boardX>0.9){
            //     boardX = 0.9
            // }
            // console.log(boardX, boardY)
            // if(boardY<0.1){
            //     boardY = 0.1
            // }else if(boardY>0.9){
            //     boardY = 0.9
            // }
            this.setState({boardcenter: [boardX, boardY]})
        
    }


    // functions for moving board
    moveBoardInit(e){
            this.setState({action:'move_board', move_board_init: this.state.boardcenter.slice(), move_board_mouse_init: [e.pageX, e.pageY]})
        
    }
    moveBoardEnd(e){
            this.setState({action:'idle', move_board_init: undefined, move_board_mouse_init:undefined})
        
    }

    getPositionOnBoard(xpix, ypix){
        var xpos = this.state.pixelwidth*(this.state.boardcenter[0]-(this.state.boardwidth/2)/this.state.boardwidth/this.state.boardzoom+xpix/this.state.boardzoom/this.state.boardwidth)
        var ypos = this.state.pixelheight*(this.state.boardcenter[1]-this.state.boardheight/2/this.state.boardheight/this.state.boardzoom+ypix/this.state.boardzoom/this.state.boardheight)
        return [xpos, ypos]
    }

    getCurrentMouseOnBoard(e){
        // console.log(e.pageX, e.pageY)
        
        var xpix = e.pageX - document.getElementById(this.state.boardname).offsetLeft
        var ypix = e.pageY - document.getElementById(this.state.boardname).offsetTop
        
        // console.log(xpix, ypix)
        
        // console.log(xpos, ypos)

        return this.getPositionOnBoard(xpix, ypix);
    }

    moveBoardEnd(){
        // console.log('thiss?')
        if(this.state.control_state=='brush' && this.state.action=='size'){
            return
        }
        if(this.state.control_state=='erase' && this.state.action=='size'){
            return
        }
        if(this.state.control_state=='style-stamp' && (this.state.action=='size'||this.state.action=='blur')){
            return
        }
        if(this.state.control_state=='move-layer' && this.state.action=='move-layer'){
            return
        }
        if(this.state.control_state=='move-layer' && this.state.action=='rotate-layer'){
            return
        }
        if(this.state.control_state=='move-layer' && this.state.action=='resize-layer'){
            return
        }
        this.setState({action:'idle', move_board_init: undefined, move_board_mouse_init:undefined})
    }

    sketchPadMouseMoveInit(e){
        console.log(e.button)
        if((this.state.control_state=='move' || e.button==1) && this.state.action=='idle'){
            this.moveBoardInit(e)
        }else if(this.state.control_state=='brush' && this.state.action=='idle'){
            this.undo_store()
            this.brushInit(e)
        }else if(this.state.control_state=='AI' && this.state.action=='idle'){
            // this.undo_store()
            this.AIDrawCanvas.current.AIbrushInit(e)
            
        }else if(this.state.control_state=='erase' && this.state.action=='idle'){
            this.undo_store()
            this.eraseInit(e)
        }else if(this.state.control_state=='brush' && this.state.action=='size'){
            // this.undo_store()
            this.setState({action:'idle'})
        }else if(this.state.control_state=='erase' && this.state.action=='size'){
            // this.undo_store()
            this.setState({action:'idle'})
        }else if(this.state.control_state=='area' && this.state.action=='idle'){
            this.undo_store()
            this.lassoInit(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='idle'){
            console.log('consome')
            if(this.isOutSideMovableArea(e)){
                this.undo_store()
                console.log('masita')
                this.moveBoardInit(e)
            }
            
        }else if(this.state.control_state=='AI' && this.state.action=='size'){
            this.setState({action:'idle'})
        }
    }

    sketchPadContextMenu(e){
        e.stopPropagation();
        e.preventDefault()
        
    }

    isOutSideMovableArea(e){
        var xmax=Number.MIN_VALUE
            var ymax = Number.MIN_VALUE
            var xmin = Number.MAX_VALUE
            var ymin = Number.MAX_VALUE
        if(this.state.lasso.length>0){
            

            for(var i in this.state.lasso){
                var cur_p = this.state.lasso[i]
                if(cur_p[0]>xmax){
                    xmax = cur_p[0]
                }else if(cur_p[0]<xmin){
                    xmin = cur_p[0]
                }

                if(cur_p[1]>ymax){
                    ymax = cur_p[1]
                }else if(cur_p[1]<ymin){
                    ymin = cur_p[1]
                }
            }
        }else if(this.state.nonlasso_ret!=undefined){
            var ret = this.state.nonlasso_ret
            xmin = ret.left
            xmax = ret.left+ret.width
            ymin = ret.top
            ymax = ret.top+ret.height
        }

        if(this.state.lasso.length>0 || this.state.nonlasso_ret!=undefined){
            // console.log(xmin, xmax, ymin, ymax)
            var mpos = this.getCurrentMouseOnBoard(e)

            if(mpos[0]>xmin && mpos[0]<xmax && mpos[1]>ymin && mpos[1]<ymax){
                return false
            }else{
                return true
            }
        }else{
            return true
        }
    }

    sketchPadMouseMove(e){
        this.setState({cur_mouse_pos: [e.pageX, e.pageY]})
        if(this.state.action=='move_board' ){
            this.moveMouse(e)
        }else if(this.state.control_state=='brush' && this.state.action=='brush'){
            this.brushMove(e)
        }else if(this.state.control_state=='erase' && this.state.action=='erase'){
            this.eraseMove(e)
        }else if(this.state.control_state=='area' && this.state.action=='lasso'){
            this.lassoMove(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='move-layer'){
            this.moveLayerMove(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='rotate-layer'){
            console.log('rot')
            this.rotateLayerMove(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='resize-layer'){
            this.resizeLayerMove(e)
        }else if(this.state.control_state=='content-stamp' && this.state.action=='content-stamp'){
            this.contentStampMove(e)
        }else if(this.state.control_state=='AI' && this.state.action=='AI_brush'){
            this.AIDrawCanvas.current.AIbrushMove(e)
            
        }

    }



    sketchPadMouseMoveEnd(e){
        e.stopPropagation()
        console.log('eeeeeennnnnnndddd')
        if(this.state.action=='move_board'){
            this.moveBoardEnd(e)
        }else if (this.state.control_state=='brush'&&this.state.action=='brush'){
            this.brushEnd(e)
        }else if (this.state.control_state=='erase'&&this.state.action=='erase'){
            this.eraseEnd(e)
        }else if(this.state.control_state=='area' && this.state.action=='lasso'){
            this.lassoEnd(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='move-layer'){
            this.moveLayerEnd(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='rotate-layer'){
            this.rotateLayerEnd(e)
        }else if(this.state.control_state=='move-layer' && this.state.action=='resize-layer'){
            this.resizeLayerEnd(e)
        }else if(this.state.control_state=='content-stamp' && this.state.action=='content-stamp'){
            this.contentStampEnd(e)
        }else if(this.state.control_state=='AI' && this.state.action=='AI_brush'){
            // this.undo_store()
            this.AIDrawCanvas.current.AIbrushEnd(e)
            
        }
    }

    sketchPadMouseMoveOut(e){
        console.log('out to where?', this.state.action)
        if(this.state.control_state=='move-layer' && this.state.action=='move-layer'){
            console.log('out to here', e.relatedTarget)
            if(e.relatedTarget.id=='sketchpad'){
                this.moveLayerEnd(e)
            }
            
        }else{
            if(this.state.action!='idle'){
                console.log('here?')
                this.moveBoardEnd(e)
            }
            
        }
    }

    undo_store(){
        // console.log(this.state.undo_states)
        var cur_layer = JSON.parse(JSON.stringify(this.state.layers[this.state.current_layer]))
        console.log(this.state.lasso_img, this.state.nonlasso_ret)
        var undo_obj = {
            type:'within_layer',
            _id: this.state.current_layer,
            layer: cur_layer,
            lasso: this.state.lasso.slice(),
            lasso_img: this.state.lasso_img, 
            nonlasso_ret: this.state.nonlasso_ret,
            unlassoed_canvas: this.state.unlassoed_canvas,
            lassoed_canvas: this.state.lassoed_canvas,
        }
        this.state.undo_states.push(undo_obj)
        if(this.state.undo_states.length>2000){
            this.state.undo_states.shift();
        }

        for(var i in this.state.redo_states){
            if(this.state.redo_states[i]['type']=='ai_gen'){
                var stroke_id = this.state.redo_states[i]['stroke_id']
                for(var j in this.state.AI_intermediate_objs){
                    if(this.state.AI_intermediate_objs[j]['stroke_id']==stroke_id){
                        delete this.state.AI_intermediate_objs[j]
                    }
                }
                delete this.state.AI_stroke_tables[stroke_id]
            }
        }  
        this.setState({redo_states: []})
    }

    undo(){
        var undo_append = ''
        console.log(this.state.undo_states, this.state.redo_states, this.state.gen_tick)
        var skip_redo = false
        if(this.state.undo_states.length>0){
            // console.log(this.state.undo_states)
            var undo_obj = this.state.undo_states.pop()
            var redo_obj
            if(undo_obj.type=='within_layer'){
                redo_obj = {
                    type:'within_layer',
                    'stroke_id': this.state.stroke_id,
                    'AI_stroke_id': this.state.AI_stroke_id,
                    _id: this.state.current_layer,
                    layer: JSON.parse(JSON.stringify(this.state.layers[this.state.current_layer])),
                    lasso: this.state.lasso.slice(),
                    lasso_img: this.state.lasso_img, 
                    nonlasso_ret: this.state.nonlasso_ret,
                    unlassoed_canvas: this.state.unlassoed_canvas,
                    lassoed_canvas: this.state.lassoed_canvas,
                }
                
                this.state.layers[undo_obj._id] = undo_obj.layer
                var el = document.getElementById('sketchpad_canvas_'+undo_obj.layer.layer_id)
                var ctx = el.getContext('2d');
                
                var img = new Image();
                img.src = undo_obj.layer.image
                var _this = this
                img.onload = function(){
                    ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                    ctx.drawImage(this, 0,0)
                }
                this.state.stroke_id=undo_obj.stroke_id
                this.state.AI_stroke_id = undo_obj.AI_stroke_id
                this.state.lasso = undo_obj.lasso
                this.state.lasso_img = undo_obj.lasso_img
                this.state.nonlasso_ret = undo_obj.nonlasso_ret
                this.state.unlassoed_canvas = undo_obj.unlassoed_canvas
                this.state.lassoed_canvas = undo_obj.lassoed_canvas
            }else if(undo_obj.type=='whole_layers'){
                redo_obj = {
                    type:'whole_layers',
                    'stroke_id': this.state.stroke_id,
                    'AI_stroke_id': this.state.AI_stroke_id,
                    layers: JSON.parse(JSON.stringify(this.state.layers)),
                    current_layer: this.state.current_layer
                }
                for(var i in undo_obj.layers){
                    var layer = undo_obj.layers[i]
                    
                    var img = new Image();
                    img.elid = layer.layer_id
                    img.src = layer.image
                    var _this = this
                    img.onload = function(){
                        var el = document.getElementById('sketchpad_canvas_'+this.elid)
                        var ctx = el.getContext('2d');
                        ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                        ctx.drawImage(this, 0,0)
                    }
                }
                this.state.stroke_id=undo_obj.stroke_id
                this.state.AI_stroke_id = undo_obj.AI_stroke_id
                this.state.layers = undo_obj.layers
                this.state.current_layer = undo_obj.current_layer

            }else if(undo_obj.type=='ai_gen'){
                undo_append = ' AI'
                console.log(this.state.stroke_id)
                // TODO if generation is being done, stop it
                console.log(this.state.gen_tick, this.state.layer_img)
                
                if(this.state.gen_tick==0){
                    redo_obj = JSON.parse(JSON.stringify(undo_obj))
                    redo_obj.AI_stroke_id = this.state.AI_stroke_id
                    redo_obj.prompt_groups = this.state.prompt_groups
                    
                    this.state.stroke_id=undefined //undo_obj.stroke_id
                    this.state.AI_stroke_id = -1 // undo_obj.AI_stroke_id
                    this.state.layers[undo_obj._id] = undo_obj.layer
                    var el = document.getElementById('sketchpad_canvas_'+undo_obj.layer.layer_id)
                    var ctx = el.getContext('2d');
                    
                    var img = new Image();
                    img.src = undo_obj.layer.image
                    var _this = this
                    img.onload = function(){
                        ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                        ctx.drawImage(this, 0,0)
                    }
                    
                    // this.state.prompts = JSON.parse(JSON.stringify(undo_obj.prompts))
                    this.state.gen_tick = -1
                    this.state.last_img = undefined
                    this.state.lasso = undo_obj.lasso
                    this.state.lasso_img = undo_obj.lasso_img
                    this.state.nonlasso_ret = undo_obj.nonlasso_ret
                    this.state.unlassoed_canvas = undo_obj.unlassoed_canvas
                    this.state.lassoed_canvas = undo_obj.lassoed_canvas
                    

                }else{
                    this.state.undo_states.push(undo_obj)
                    var gen_tick = this.state.gen_tick
                    console.log(gen_tick, 'undo')
                    if(gen_tick==-1){
                        console.log('undo!')
                        gen_tick = this.state.AI_stroke_tables[undo_obj.stroke_id][undo_obj.AI_stroke_id].length
                        // do undo store
                        this.state.stroke_id = undo_obj.stroke_id
                        this.state.AI_stroke_id = undo_obj.AI_stroke_id
                        this.state.layer_img = undo_obj.layer_img
                        this.state.last_img = undo_obj.last_img
                        this.state.area_img = undo_obj.area_img
                        this.state.seed = undo_obj.seed
                        this.state.overcoat_ratio = undo_obj.overcoat_ratio
                        // 
                        
                        // this.state.cutxmin = undo_obj.cutxmin
                        // this.state.cutymin = undo_obj.cutymin
                        // this.state.cutxmax = undo_obj.cutxmax
                        // this.state.cutymax = undo_obj.cutymax
                        // this.state.gen_steps = undo_obj.gen_steps
                        var obj_id = this.state.AI_stroke_tables[undo_obj.stroke_id][this.state.AI_stroke_id][gen_tick-1]
                        var obj = this.state.AI_intermediate_objs[obj_id]
                        // this.state.prompt_groups = JSON.parse(JSON.stringify(obj.prompt_groups))
                        // this.state.directional_prompts = JSON.parse(JSON.stringify(obj.directional_prompts))
                        // this.state.prompts = JSON.parse(JSON.stringify(obj.prompts))

                        for(var i in obj.directional_prompts){
                            var passed = false
                            for(var j in this.state.directional_prompts){
                                if(this.state.directional_prompts[j]._id==obj.directional_prompts[i]._id){
                                    passed = true
                                    continue
                                }
                            }
                            if(passed == false){
                                this.state.directional_prompts.push(JSON.parse(JSON.stringify(obj.directional_prompts[i])))
                            }
                        }

                        var groups_added = {}
                        for(var i in obj.prompts){
                            var passed = false
                            for(var j in this.state.prompts){
                                if(this.state.prompts[j]._id==obj.prompts[i]._id){
                                    passed = true
                                    continue
                                }
                            }
                            if(passed==false){
                                groups_added[i] = JSON.parse(JSON.stringify(obj.prompts[i]))
                            }
                            
                        }

                        var new_prompts = []
                        var pcounter = 0
                        var new_prompt_groups = JSON.parse(JSON.stringify(this.state.prompt_groups))
                        console.log(this.state.prompts)
                        for(var i=0; i<this.state.prompts.length+Object.keys(groups_added).length; i++){
                            console.log(groups_added[i])
                            if(groups_added[i]!=undefined){
                                new_prompts.push(groups_added[i])
                            }else{
                                new_prompts.push(this.state.prompts[pcounter])
                                for(var j in new_prompt_groups){
                                    if(new_prompt_groups[j].indexOf(pcounter)!=-1){
                                        new_prompt_groups[j][new_prompt_groups[j].indexOf(pcounter)] = i
                                    }
                                }
                                pcounter = pcounter+1

                            }
                        }
                        console.log(new_prompt_groups, groups_added, new_prompts)
                        console.log(new_prompt_groups.concat(JSON.parse(JSON.stringify(obj.prompt_groups))))
                        this.state.prompts = new_prompts
                        this.state.prompt_groups = new_prompt_groups.concat(JSON.parse(JSON.stringify(obj.prompt_groups)))
                    }

                    var obj_id = this.state.AI_stroke_tables[undo_obj.stroke_id][this.state.AI_stroke_id][gen_tick-1]
                    var obj = this.state.AI_intermediate_objs[obj_id]
                    console.log(gen_tick, obj_id, obj, Object.keys(this.state.AI_intermediate_objs).length)
                    if(obj==undefined){
                        return
                    }

                    this.state.current_layer = obj.current_layer
                    this.state.layers[obj.current_layer] = JSON.parse(JSON.stringify(obj.layer))
                    var el = document.getElementById('sketchpad_canvas_'+obj.layer.layer_id)
                    var ctx = el.getContext('2d');
                    
                    var img = new Image();
                    img.src = obj.layer.image
                    var _this = this
                    img.onload = function(){
                        ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                        ctx.drawImage(this, 0,0)
                    }

                    this.state.gen_tick = gen_tick-1
                    this.state.guidance_scale = obj.guidance_scale
                    this.state.gen_steps = obj.gen_steps
                    // this.state.selected_prompt = JSON.parse(JSON.stringify(obj.selected_prompt))
                    // this.state.directional_prompts = JSON.parse(JSON.stringify(obj.directional_prompts))
                    // this.state.prompts = JSON.parse(JSON.stringify(obj.prompts))

                    if(this.state.undo_prompts){
                        for(var i in this.state.prompts){
                            for(var j in obj.prompts){
                                if(this.state.prompts[i]._id == obj.prompts[j]._id){
                                    this.state.prompts[i].prompt = obj.prompts[j].prompt
                                    continue
                                }
                            }
                        }

                        for(var i in this.state.directional_prompts){
                            for(var j in obj.directional_prompts){
                                if(this.state.directional_prompts[i]._id == obj.directional_prompts[j]._id){
                                    this.state.directional_prompts[i].promptA = obj.directional_prompts[j].promptA
                                    this.state.directional_prompts[i].promptB = obj.directional_prompts[j].promptB
                                    continue
                                }
                            }
                        }
                    }
                    
                    
                    
                    // this.state.prompt_groups = JSON.parse(JSON.stringify(obj.prompt_groups))
                    // if(gen_tick==this.state.AI_stroke_tables[undo_obj.stroke_id][undo_obj.AI_stroke_id].length){
                    //     this.state.prompt_groups = JSON.parse(JSON.stringify(obj.prompt_groups))
                    // }
                    obj.prompt_groups = JSON.parse(JSON.stringify(this.state.prompt_groups))
                    
                    
                    this.state.latents = obj.latents
                    this.state.cutxmin = obj.cutxmin
                    this.state.cutymin = obj.cutymin
                    this.state.cutxmax = obj.cutxmax
                    this.state.cutymax = obj.cutymax

                    if(this.state.gen_tick==this.state.AI_stroke_tables[undo_obj.stroke_id][undo_obj.AI_stroke_id].length-1 || gen_tick==-1){
                        this.setState({}, function(){
                            _this.PromptController.current.Palette.current.draw3DMix()
                        })
                        // this.state.selected_prompt = JSON.parse(JSON.stringify(obj.selected_prompt))
                    }

                    skip_redo = true

                }


            }
            if(skip_redo==false){
                this.state.redo_states.push(redo_obj)
            }
            
            this.setState({}, ()=>{
                this.storeCurrentState('undo'+undo_append)
            })
        }
        
    }

    redo(){
        console.log(this.state.undo_states, this.state.redo_states)
        var skip_undo = false
        var undo_obj
        var redo_append = ''

        if(this.state.undo_states.length>0){
            var last_undo_obj = this.state.undo_states[this.state.undo_states.length-1]
            
            if(last_undo_obj.type=='ai_gen'){
                redo_append = ' AI'
                if(this.state.gen_tick!=-1 && this.state.gen_tick<this.state.AI_stroke_tables[last_undo_obj.stroke_id][last_undo_obj.AI_stroke_id].length-1){
                    console.log('stuckingen')

                    var gen_tick = this.state.gen_tick

                    var obj_id = this.state.AI_stroke_tables[last_undo_obj.stroke_id][this.state.AI_stroke_id][gen_tick+1]
                    var obj = this.state.AI_intermediate_objs[obj_id]
                    console.log(obj_id, obj)

                    this.state.current_layer = obj.current_layer
                    this.state.layers[obj.current_layer] = JSON.parse(JSON.stringify(obj.layer))
                    var el = document.getElementById('sketchpad_canvas_'+obj.layer.layer_id)
                    var ctx = el.getContext('2d');
                    
                    var img = new Image();
                    img.src = obj.layer.image
                    var _this = this
                    img.onload = function(){
                        ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                        ctx.drawImage(this, 0,0)
                    }

                    this.state.gen_tick = gen_tick+1
                    this.state.guidance_scale = obj.guidance_scale
                    this.state.gen_steps = obj.gen_steps
                    // this.state.selected_prompt = obj.selected_prompt
                    
                    // this.state.prompts = JSON.parse(JSON.stringify(obj.prompts))

                    if(this.state.undo_prompts){
                        for(var i in this.state.prompts){
                            for(var j in obj.prompts){
                                if(this.state.prompts[i]._id == obj.prompts[j]._id){
                                    this.state.prompts[i].prompt = obj.prompts[j].prompt
                                    continue
                                }
                            }
                        }

                        for(var i in this.state.directional_prompts){
                            for(var j in obj.directional_prompts){
                                if(this.state.directional_prompts[i]._id == obj.directional_prompts[j]._id){
                                    this.state.directional_prompts[i].promptA = obj.directional_prompts[j].promptA
                                    this.state.directional_prompts[i].promptB = obj.directional_prompts[j].promptB
                                    continue
                                }
                            }
                        }
                        // this.state.directional_prompts = JSON.parse(JSON.stringify(obj.directional_prompts))
                    }
                    
                    
                    
                    // this.state.prompt_groups = obj.prompt_groups
                    obj.prompt_groups = JSON.parse(JSON.stringify(this.state.prompt_groups))
                    this.state.latents = obj.latents
                    this.state.cutxmin = obj.cutxmin
                    this.state.cutymin = obj.cutymin
                    this.state.cutxmax = obj.cutxmax
                    this.state.cutymax = obj.cutymax
                    this.state.stroke_id = last_undo_obj.stroke_id
                    // this.state.AI_stroke_id = last_undo_obj.AI_stroke_id
                    this.setState({})
                    return
                }
                else if(this.state.gen_tick==this.state.AI_stroke_tables[last_undo_obj.stroke_id][last_undo_obj.AI_stroke_id].length-1){
                    console.log('transition')
                    this.state.gen_tick = -1
                    this.state.stroke_id = undefined
                    this.state.last_img = undefined
                    this.state.undo_states[this.state.undo_states.length-1].AI_stroke_id = this.state.AI_stroke_id
                    this.state.AI_stroke_id = -1
                    
                    this.setState({})
                    return
                }
                // do something

            }
        }



        if(this.state.redo_states.length>0){
            
            var redo_obj = this.state.redo_states.pop()
            
            
            
            if(redo_obj.type=='within_layer'){
                undo_obj = {
                    type:'within_layer',
                    'stroke_id': this.state.stroke_id,
                    'AI_stroke_id': this.state.AI_stroke_id,
                    _id: this.state.current_layer,
                    layer: JSON.parse(JSON.stringify(this.state.layers[this.state.current_layer])),
                    lasso: this.state.lasso.slice(),
                    lasso_img: this.state.lasso_img, 
                    nonlasso_ret: this.state.nonlasso_ret,
                    unlassoed_canvas: this.state.unlassoed_canvas,
                    lassoed_canvas: this.state.lassoed_canvas,
                }

                this.state.layers[redo_obj._id] = redo_obj.layer
                var el = document.getElementById('sketchpad_canvas_'+redo_obj.layer.layer_id)
                var ctx = el.getContext('2d');
                
                var img = new Image();
                img.src = redo_obj.layer.image
                var _this = this
                img.onload = function(){
                    ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                    ctx.drawImage(this, 0,0)
                }
                this.state.stroke_id=redo_obj.stroke_id
                this.state.AI_stroke_id = redo_obj.AI_stroke_id
                this.state.lasso = redo_obj.lasso
                this.state.lasso_img = redo_obj.lasso_img
                this.state.nonlasso_ret = redo_obj.nonlasso_ret
                this.state.unlassoed_canvas = redo_obj.unlassoed_canvas
                this.state.lassoed_canvas = redo_obj.lassoed_canvas
            }else if(redo_obj.type=='whole_layers'){
                undo_obj = {
                    type:'whole_layers',
                    'stroke_id': this.state.stroke_id,
                    'AI_stroke_id': this.state.AI_stroke_id,
                    layers: JSON.parse(JSON.stringify(this.state.layers)),
                    current_layer: this.state.current_layer
                }
                for(var i in redo_obj.layers){
                    var layer = redo_obj.layers[i]
                    
                    var img = new Image();
                    img.elid = layer.layer_id
                    img.src = layer.image
                    var _this = this
                    img.onload = function(){
                        var el = document.getElementById('sketchpad_canvas_'+this.elid)
                        var ctx = el.getContext('2d');
                        ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                        ctx.drawImage(this, 0,0)
                    }
                }
                this.state.stroke_id=redo_obj.stroke_id
                this.state.AI_stroke_id = redo_obj.AI_stroke_id
                this.state.layers = redo_obj.layers
                this.state.current_layer = redo_obj.current_layer

            }else if(redo_obj.type == 'ai_gen'){
                redo_append = ' AI'
                undo_obj = JSON.parse(JSON.stringify(redo_obj))
                this.state.stroke_id=redo_obj.stroke_id
                this.state.AI_stroke_id = redo_obj.AI_stroke_id
                console.log(redo_obj.stroke_id, redo_obj.AI_stroke_id, redo_obj.gen_tick)

                this.state.layer_img = redo_obj.layer_img
                this.state.last_img = redo_obj.last_img
                this.state.area_img = redo_obj.area_img
                this.state.seed = redo_obj.seed
                this.state.overcoat_ratio = redo_obj.overcoat_ratio

                var gen_tick = 0

                var obj_id = this.state.AI_stroke_tables[redo_obj.stroke_id][redo_obj.AI_stroke_id][gen_tick]
                var obj = this.state.AI_intermediate_objs[obj_id]
                console.log(obj_id, obj)

                this.state.current_layer = obj.current_layer
                this.state.layers[obj.current_layer] = JSON.parse(JSON.stringify(obj.layer))
                var el = document.getElementById('sketchpad_canvas_'+obj.layer.layer_id)
                var ctx = el.getContext('2d');
                
                var img = new Image();
                img.src = obj.layer.image
                var _this = this
                img.onload = function(){
                    ctx.clearRect(0,0,_this.state.pixelwidth,_this.state.pixelheight);
                    ctx.drawImage(this, 0,0)
                }

                this.state.gen_tick = gen_tick
                this.state.guidance_scale = obj.guidance_scale
                this.state.gen_steps = obj.gen_steps
                for(var i in obj.directional_prompts){
                    var passed = false
                    for(var j in this.state.directional_prompts){
                        if(this.state.directional_prompts[j]._id==obj.directional_prompts[i]._id){
                            passed = true
                            continue
                        }
                    }
                    if(passed == false){
                        this.state.directional_prompts.push(JSON.parse(JSON.stringify(obj.directional_prompts[i])))
                    }
                }

                var groups_added = {}
                for(var i in obj.prompts){
                    var passed = false
                    for(var j in this.state.prompts){
                        if(this.state.prompts[j]._id==obj.prompts[i]._id){
                            passed = true
                            continue
                        }
                    }
                    if(passed==false){
                        groups_added[i] = JSON.parse(JSON.stringify(obj.prompts[i]))
                    }
                    
                }

                var new_prompts = []
                var pcounter = 0
                var new_prompt_groups = JSON.parse(JSON.stringify(this.state.prompt_groups))
                console.log(this.state.prompts)
                for(var i=0; i<this.state.prompts.length+Object.keys(groups_added).length; i++){
                    console.log(groups_added[i])
                    if(groups_added[i]!=undefined){
                        new_prompts.push(groups_added[i])
                    }else{
                        new_prompts.push(this.state.prompts[pcounter])
                        for(var j in new_prompt_groups){
                            if(new_prompt_groups[j].indexOf(pcounter)!=-1){
                                new_prompt_groups[j][new_prompt_groups[j].indexOf(pcounter)] = i
                            }
                        }
                        pcounter = pcounter+1

                    }
                }
                console.log(groups_added, new_prompts)
                this.state.prompts = new_prompts
                this.state.prompt_groups = new_prompt_groups.concat(JSON.parse(JSON.stringify(obj.prompt_groups)))


                this.state.latents = obj.latents
                this.state.cutxmin = obj.cutxmin
                this.state.cutymin = obj.cutymin
                this.state.cutxmax = obj.cutxmax
                this.state.cutymax = obj.cutymax
                
            }
            this.state.undo_states.push(undo_obj)
            var _this = this
            this.setState({}, function(){
                _this.PromptController.current.Palette.current.draw3DMix()
                _this.storeCurrentState('redo'+redo_append)
            })
        }
        
    }

    brushInit(e){
        if(this.state.current_layer==-1){
            return
        }
        console.log(this.state.layers)
        var brush_canvas = document.createElement('canvas')
        brush_canvas.width = this.state.brush_size
        brush_canvas.height = this.state.brush_size
        var brush_canvas_ctx = brush_canvas.getContext('2d')
        brush_canvas_ctx.fillStyle=this.state.brush_color
        // brush_canvas_ctx.fillRect(0, 0, brush_canvas.width, brush_canvas.height)
        brush_canvas_ctx.arc(brush_canvas.width/2, brush_canvas.height/2, this.state.brush_size/2, 0, 2*Math.PI, false)
        brush_canvas_ctx.closePath()
        brush_canvas_ctx.fill();
        brush_canvas_ctx.globalCompositeOperation = "destination-in";
        
        // brush_canvas_ctx.drawImage(this.state.brush_img, 0, 0, this.state.brush_size, this.state.brush_size)
        console.log(brush_canvas_ctx)

        var cur_colored_brush_img = new Image();

        var brush_pre_canvas = document.createElement('canvas')
        brush_pre_canvas.width = this.state.pixelwidth
        brush_pre_canvas.height = this.state.pixelheight
        var brush_pre_canvas_ctx = brush_pre_canvas.getContext('2d')
        brush_pre_canvas_ctx.lineJoin = brush_pre_canvas_ctx.lineCap = 'round'

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var ctx = el.getContext('2d');
        ctx.lineJoin = ctx.lineCap = 'round'
        
        // console.log(this.state.brush_img)
        var brush_cur = this.getCurrentMouseOnBoard(e)

        brush_pre_canvas_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight);

        var x = brush_cur[0]-this.state.brush_size/2;
        var y = brush_cur[1]-this.state.brush_size/2;

        var _this = this

        brush_pre_canvas_ctx.beginPath()
        brush_pre_canvas_ctx.arc(brush_cur[0], brush_cur[1], this.state.brush_size/2, 0, 2*Math.PI, false)
        brush_pre_canvas_ctx.fillStyle=this.state.brush_color
        brush_pre_canvas_ctx.closePath()
        brush_pre_canvas_ctx.fill();

        if(_this.state.lasso_img!=undefined){
            brush_pre_canvas_ctx.globalCompositeOperation = 'destination-in'
            brush_pre_canvas_ctx.drawImage(_this.state.lasso_img, 0, 0, _this.state.pixelwidth, _this.state.pixelheight)
            brush_pre_canvas_ctx.globalCompositeOperation = 'source-over'
        }
        ctx.drawImage(brush_pre_canvas, 0, 0)

        _this.setState({action:'brush', brush_cur:brush_cur, cur_colored_brush_img: cur_colored_brush_img, brush_pre_canvas:brush_pre_canvas, origin_image: cur_image})

        // cur_colored_brush_img.onload=function(){
            
        //     brush_pre_canvas_ctx.drawImage(this, x, y);

        //     if(_this.state.lasso_img!=undefined){
        //         brush_pre_canvas_ctx.globalCompositeOperation = 'destination-in'
        //         brush_pre_canvas_ctx.drawImage(_this.state.lasso_img, 0, 0, _this.state.pixelwidth, _this.state.pixelheight)
        //         brush_pre_canvas_ctx.globalCompositeOperation = 'source-over'
        //     }
        //     // move lasso image to context
        //     ctx.drawImage(brush_pre_canvas, 0, 0)
    
        //     // var Data_t = brush_pre_canvas_ctx.getImageData(0,0,_this.state.pixelwidth, _this.state.pixelheight)
        //     // // console.log(Data_t)
        //     // for(var idx=0; idx<this.width*this.height; idx++){
        //     //     var w = idx%this.width
        //     //     var h = parseInt(idx/this.width)

        //     //     var idx_f = _this.state.pixelwidth*(parseInt(y)+h)+parseInt(x)+w
        //     //     if(Data_t.data[idx_f*4+3]>0){
        //     //         _this.state.ratioData[_this.state.layers[_this.state.current_layer].layer_id][idx_f] = 100
        //     //     }
                
        //     // }

        //     _this.setState({action:'brush', brush_cur:brush_cur, cur_colored_brush_img: cur_colored_brush_img, brush_pre_canvas:brush_pre_canvas, origin_image: cur_image})
        
        // }

        
        
        // console.log(brush_canvas.toDataURL())
        cur_colored_brush_img.src = brush_canvas.toDataURL();

        
        
    }

    distanceBetween(point1, point2){
        return Math.sqrt(Math.pow(point2[0] - point1[0], 2) + Math.pow(point2[1] - point1[1], 2));
    }
    angleBetween(point1, point2){
        return Math.atan2( point2[0] - point1[0], point2[1] - point1[1] );
    }

    brushMove(e){
        // draw on the canvas
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        var brush_pre_canvas = this.state.brush_pre_canvas
        var brush_pre_ctx = brush_pre_canvas.getContext('2d');
        // brush_pre_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight);

        var brush_cur = this.getCurrentMouseOnBoard(e)

        var dist = this.distanceBetween(brush_cur, this.state.brush_cur)
        var angle = this.angleBetween(brush_cur, this.state.brush_cur)

        for (var i=0; i<dist; i++){
            var x = brush_cur[0]+(Math.sin(angle)*i)-this.state.brush_size/2;
            var y = brush_cur[1]+(Math.cos(angle)*i)-this.state.brush_size/2;
            brush_pre_ctx.drawImage(this.state.cur_colored_brush_img, x, y);
        }
        
        // apply lasso
        if(this.state.lasso_img!=undefined){
            brush_pre_ctx.globalCompositeOperation = 'destination-in'
            brush_pre_ctx.drawImage(this.state.lasso_img, 0, 0, this.state.pixelwidth, this.state.pixelheight)
            brush_pre_ctx.globalCompositeOperation = 'source-over'
        }
        // move lasso image to context
        ctx.drawImage(brush_pre_canvas, 0, 0)
        this.setState({brush_cur:brush_cur, brush_pre_canvas:brush_pre_canvas })


    }

    brushEnd(e){
        // console.log('thiss?')
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var layers = this.state.layers
        layers[this.state.current_layer].image = cur_image

        // var brush_pre_canvas = this.state.brush_pre_canvas
        // var brush_pre_ctx = brush_pre_canvas.getContext('2d');
        // var Data_t = brush_pre_ctx.getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // console.log(brush_pre_canvas.toDataURL())
        // console.log(Data_t.data)
        // for(var idx=0; idx<this.state.ratioData[this.state.layers[this.state.current_layer].layer_id].length; idx++){
        //     if(Data_t.data[idx*4+3]>0){
        //         this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][idx] = 100
        //     }
        // }
        
        // TODO add functions to update?
        this.setState({action:'idle', brush_cur:undefined, cur_colored_brush_img: undefined, brush_pre_canvas: undefined}, ()=>{
            this.storeCurrentState('brush')
        })
        
        
    }

    eraseInit(e){
        if(this.state.current_layer==-1){
            return
        }
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        var cur_image = el.toDataURL()
        ctx.globalCompositeOperation ='destination-out'
        ctx.lineWidth = this.state.erase_size
        ctx.beginPath();
        var brush_cur = this.getCurrentMouseOnBoard(e).slice()
        ctx.moveTo(brush_cur[0], brush_cur[1])

        var brush_pre_canvas = document.createElement('canvas')
        brush_pre_canvas.width = this.state.pixelwidth
        brush_pre_canvas.height = this.state.pixelheight
        var brush_pre_canvas_ctx = brush_pre_canvas.getContext('2d')
        //draw init circle
        brush_pre_canvas_ctx.beginPath()
        brush_pre_canvas_ctx.arc(brush_cur[0], brush_cur[1], this.state.erase_size/2, 0, 2*Math.PI, false)
        brush_pre_canvas_ctx.fillStyle='black'
        brush_pre_canvas_ctx.closePath()
        // brush_pre_canvas_ctx.stroke();
        brush_pre_canvas_ctx.fill();
        if(this.state.lasso_img!=undefined){
            brush_pre_canvas_ctx.globalCompositeOperation='destination-in'
            brush_pre_canvas_ctx.drawImage(this.state.lasso_img, 0, 0, this.state.pixelwidth, this.state.pixelheight)
            brush_pre_canvas_ctx.globalCompositeOperation='source-over'
        }
        ctx.drawImage(brush_pre_canvas, 0, 0)

        // var Data_t = brush_pre_canvas_ctx.getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        
        // for(var idx=0; idx<this.state.pixelwidth*this.state.pixelheight; idx++){
        //     if(Data_t.data[idx*4+3]==0){
        //         this.state.ratioData[idx] = 0
        //     }
            
        // }
        
        // brush_pre_canvas_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight);

        


        this.setState({action:'erase', brush_cur: brush_cur, brush_pre_canvas: brush_pre_canvas, origin_image: cur_image})
        
    }

    eraseMove(e){
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');

        var brush_pre_canvas = this.state.brush_pre_canvas
        var brush_pre_canvas_ctx = brush_pre_canvas.getContext('2d')

        // brush_pre_canvas_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight);

        var brush_cur = this.getCurrentMouseOnBoard(e).slice()

        // console.log('?')
        brush_pre_canvas_ctx.lineWidth = this.state.erase_size
        brush_pre_canvas_ctx.beginPath()
        brush_pre_canvas_ctx.moveTo(this.state.brush_cur[0], this.state.brush_cur[1])
        brush_pre_canvas_ctx.lineTo(brush_cur[0], brush_cur[1])
        brush_pre_canvas_ctx.lineJoin = 'round'
        ctx.lineCap = 'round';
        brush_pre_canvas_ctx.stroke()
        brush_pre_canvas_ctx.closePath();

        if(this.state.lasso_img!=undefined){
            brush_pre_canvas_ctx.globalCompositeOperation='destination-in'
            brush_pre_canvas_ctx.drawImage(this.state.lasso_img, 0, 0, this.state.pixelwidth, this.state.pixelheight)
            brush_pre_canvas_ctx.globalCompositeOperation='source-over'
        }

        ctx.drawImage(brush_pre_canvas, 0, 0)

        // var brush_pre_canvas = this.state.brush_pre_canvas
        // var brush_pre_canvas_ctx = brush_pre_canvas.getContext('2d')
        //draw init circle
        brush_pre_canvas_ctx.lineWidth = 1
        // brush_pre_canvas_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight);
        brush_pre_canvas_ctx.beginPath()
        brush_pre_canvas_ctx.arc(brush_cur[0], brush_cur[1], this.state.erase_size/2, 0, 2*Math.PI, false)
        brush_pre_canvas_ctx.fillStyle='black'
        brush_pre_canvas_ctx.fill();
        brush_pre_canvas_ctx.closePath();

        
        if(this.state.lasso_img!=undefined){
            brush_pre_canvas_ctx.globalCompositeOperation='destination-in'
            brush_pre_canvas_ctx.drawImage(this.state.lasso_img, 0, 0, this.state.pixelwidth, this.state.pixelheight)
            brush_pre_canvas_ctx.globalCompositeOperation='source-over'
        }

        ctx.drawImage(brush_pre_canvas, 0, 0)

        // var Data_t = brush_pre_canvas_ctx.getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // for(var idx=0; idx<this.state.pixelwidth*this.state.pixelheight; idx++){
        //     if(Data_t.data[idx*4+3]==0){
        //         this.state.ratioData[idx] = 0
        //     }
            
        // }
        

        this.setState({brush_cur: brush_cur, brush_pre_canvas:brush_pre_canvas})
    }

    eraseEnd(e){
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var layers = this.state.layers
        var brush_cur = this.getCurrentMouseOnBoard(e).slice()
        layers[this.state.current_layer].image = cur_image

        // var brush_pre_canvas = this.state.brush_pre_canvas
        // var brush_pre_canvas_ctx = brush_pre_canvas.getContext('2d')
        // var Data_t = brush_pre_canvas_ctx.getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // for(var idx=0; idx<this.state.ratioData[this.state.layers[this.state.current_layer].layer_id].length; idx++){
        //     if(Data_t.data[idx*4+3]>0){
        //         this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][idx] = 0
        //     }
            
        // }

        // TODO add a function?
        var _this = this
        this.setState({action:'idle', brush_cur: undefined, brush_pre_canvas:undefined}, function(){
            var el = document.getElementById('sketchpad_canvas_'+_this.state.layers[_this.state.current_layer].layer_id)
            var ctx = el.getContext('2d');
            ctx.globalCompositeOperation ='source-over'
            this.storeCurrentState('erase')
        })
    }


    lassoInit(e){
        if(this.state.current_layer==-1){
            return
        }
        var pos = this.getCurrentMouseOnBoard(e)
        console.log(pos)
        this.setState({action:'lasso', lasso:[[pos[0], pos[1]]]})
    }

    lassoMove(e){
        var pos = this.getCurrentMouseOnBoard(e)
        var lasso = this.state.lasso
        // console.log(pos)
        lasso.push([pos[0], pos[1]])
        this.setState({lasso:lasso})
    }

    lassoEnd(e){
        if(this.state.lasso.length>1){
            var canvas = document.createElement('canvas')
            var ctx = canvas.getContext('2d')
            canvas.width = this.state.pixelwidth
            canvas.height = this.state.pixelheight
            ctx.beginPath();
            ctx.fillStyle='black';
            for(var i in this.state.lasso){
                var point = this.state.lasso[i]
                // console.log(point)
                if(i==0){
                    ctx.moveTo(point[0], point[1])
                }else{
                    ctx.lineTo(point[0], point[1])
                }
            }
            ctx.closePath()
            ctx.stroke()
            ctx.fill();
          
            this.setState({action:'idle', lasso_img:canvas}, ()=>{
                this.storeCurrentState('lasso')
            })
        }else{
            this.setState({action:'idle', lasso_img:undefined, lasso:[]}, ()=>{
                this.storeCurrentState('unlasso')
            })
        }
        
    }

    moveLayerInit(e){
        e.stopPropagation()
        if(this.state.current_layer==-1){
            return
        }
        var pos = this.getCurrentMouseOnBoard(e)
        var adjust_pre_canvas = document.createElement('canvas')
        adjust_pre_canvas.width = this.state.pixelwidth
        adjust_pre_canvas.height = this.state.pixelheight

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()

        // adjust_pre_canvas.getContext('2d') = 
        if(this.state.lasso.length>0){
            // var origin_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
            // var moving_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
            // // var unlassoed_data = this.state.unlassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
            // var lassoed_data = this.state.lassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)

            // for(var i=0; i<unlassoed_data.data.length; i+=4){
            //     if(unlassoed_data.data[i+3]>0){
            //         origin_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
            //     }
            //     if(lassoed_data.data[i+3]>0){
                    
            //         moving_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
            //     }
            // }
            this.setState({action:'move-layer', move_layer_init_pos: pos, adjust_pre_canvas: adjust_pre_canvas, 
                init_lasso:this.state.lasso.slice(0), origin_image: cur_image,
                // origin_ratioData: origin_ratioData, moving_ratioData: moving_ratioData
            })
        }else{
            // console.log(JSON.parse(JSON.stringify(this.state.nonlasso_ret)))
            // var origin_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
            // var moving_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
            // console.log(this.state.lassoed_canvas)
            // var lassoed_data = this.state.lassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
            
            // for(var i=0; i<lassoed_data.data.length; i+=4){
            //     if(lassoed_data.data[i+3]>0){
            //         // console.log(lassoed_data.data[i+3])
            //         moving_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
            //     }
            // }
            this.setState({action:'move-layer', move_layer_init_pos: pos, adjust_pre_canvas: adjust_pre_canvas, 
                init_nonlasso_ret:JSON.parse(JSON.stringify(this.state.nonlasso_ret)), origin_image: cur_image,
                // origin_ratioData: origin_ratioData, moving_ratioData: moving_ratioData
            })
        }
        this.undo_store()
        
    }

    moveLayerMove(e){  
        console.log('moving..')
        var adjust_pre_canvas = this.state.adjust_pre_canvas
        var adjust_pre_ctx = adjust_pre_canvas.getContext('2d')
        adjust_pre_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)

        var pos = this.getCurrentMouseOnBoard(e)

        adjust_pre_ctx.drawImage(this.state.unlassoed_canvas, 0, 0)

        adjust_pre_ctx.translate(pos[0]-this.state.move_layer_init_pos[0], pos[1]-this.state.move_layer_init_pos[1])
        adjust_pre_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        adjust_pre_ctx.translate(-pos[0]+this.state.move_layer_init_pos[0], -pos[1]+this.state.move_layer_init_pos[1])

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)

        ctx.drawImage(adjust_pre_canvas, 0, 0)

        // var new_ratioData = this.state.origin_ratioData.slice()
        // var moving_ratioData = this.state.moving_ratioData
        // var xtranslate = pos[0]-this.state.move_layer_init_pos[0]
        // var ytranslate = pos[1]-this.state.move_layer_init_pos[1]
        // for(var i=0; i<new_ratioData.length; i++){
        //     var w = i%this.state.pixelwidth
        //     var h = parseInt(i/this.state.pixelwidth)

        //     var new_h=h-parseInt(ytranslate)
        //     var new_w=w-parseInt(xtranslate)
        //     if(new_h<0 || new_w<0 || new_h>=this.state.pixelheight || new_w>=this.state.pixelwidth){
        //         continue
        //     }
        //     var new_i = new_w+new_h*this.state.pixelwidth
        //     if(moving_ratioData[new_i]>0){
        //         // console.log(w, h, new_w, new_h, xtranslate, ytranslate)
        //         new_ratioData[i] = moving_ratioData[new_i]
        //     }
        // }

        if(this.state.lasso.length>0){
            var init_lasso = this.state.init_lasso    
            var lasso = []
            for (var i in init_lasso){
                var po = init_lasso[i]
                lasso.push([po[0]+pos[0]-this.state.move_layer_init_pos[0], po[1]+pos[1]-this.state.move_layer_init_pos[1]])
            }
            // this.state.ratioData[this.state.layers[this.state.current_layer].layer_id] = new_ratioData
            this.setState({lasso})
        }else{
            var nonlasso_ret = {}
            nonlasso_ret.left = this.state.init_nonlasso_ret.left+pos[0]-this.state.move_layer_init_pos[0]
            nonlasso_ret.top = this.state.init_nonlasso_ret.top+pos[1]-this.state.move_layer_init_pos[1]
            nonlasso_ret.width = this.state.init_nonlasso_ret.width
            nonlasso_ret.height = this.state.init_nonlasso_ret.height
            // console.log(nonlasso_ret)
            // this.state.ratioData[this.state.layers[this.state.current_layer].layer_id] = new_ratioData
            this.setState({nonlasso_ret})
        }
        
        

    }

    moveLayerEnd(e){
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var layers = this.state.layers
        layers[this.state.current_layer]['image'] = cur_image

        var pos = this.getCurrentMouseOnBoard(e)
        var lassoed_canvas = this.state.lassoed_canvas

        // var new_ratioData = this.state.origin_ratioData.slice()
        // var moving_ratioData = this.state.moving_ratioData
        // var xtranslate = pos[0]-this.state.move_layer_init_pos[0]
        // var ytranslate = pos[1]-this.state.move_layer_init_pos[1]
        // for(var i=0; i<new_ratioData.length; i++){
        //     var w = i%this.state.pixelwidth
        //     var h = parseInt(i/this.state.pixelwidth)

        //     var new_h=h-parseInt(ytranslate)
        //     var new_w=w-parseInt(xtranslate)
        //     if(new_h<0 || new_w<0 || new_h>=this.state.pixelheight || new_w>=this.state.pixelwidth){
        //         continue
        //     }
        //     var new_i = new_w+new_h*this.state.pixelwidth
        //     if(moving_ratioData[new_i]>0){
        //         // console.log(w, h, new_w, new_h, xtranslate, ytranslate)
        //         new_ratioData[i] = moving_ratioData[new_i]
        //     }
        // }

        // this.state.ratioData[this.state.layers[this.state.current_layer].layer_id] = new_ratioData
        

        var new_l_canvas = document.createElement('canvas')
        new_l_canvas.width = this.state.pixelwidth
        new_l_canvas.height = this.state.pixelheight
        new_l_canvas.getContext('2d').translate(pos[0]-this.state.move_layer_init_pos[0], pos[1]-this.state.move_layer_init_pos[1])
        new_l_canvas.getContext('2d').drawImage(lassoed_canvas, 0, 0)

        if(this.state.lasso.length>0){
            var new_lasso = document.createElement('canvas')
            new_lasso.width = this.state.pixelwidth
            new_lasso.height = this.state.pixelheight
            new_lasso.getContext('2d').translate(pos[0]-this.state.move_layer_init_pos[0], pos[1]-this.state.move_layer_init_pos[1])
            new_lasso.getContext('2d').drawImage(this.state.lasso_img, 0, 0)
            
            // TODO add a function?
            this.setState({action:'idle', move_layer_init_pos: undefined, adjust_pre_canvas: undefined, lassoed_canvas:new_l_canvas, lasso_img: new_lasso}, ()=>{
                this.storeCurrentState('movelayer')
            })
        }else{
            var ctx = el.getContext('2d');
            var ret = this.getCanvasBoundingBox(ctx)
            
            // TODO add a function?
            this.setState({action:'idle', move_layer_init_pos: undefined, adjust_pre_canvas: undefined, lassoed_canvas:new_l_canvas, nonlasso_ret: ret}, ()=>{
                this.storeCurrentState('movelayer')
            })
        }
        
        
        
        
    }

    rotateLayerInit(e){
        if(this.state.current_layer==-1){
            return
        }
        var adjust_pre_canvas = document.createElement('canvas')
        adjust_pre_canvas.width = this.state.pixelwidth
        adjust_pre_canvas.height = this.state.pixelheight

        var rotateCenter = []

        // var origin_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
        // var moving_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
        // var unlassoed_data = this.state.unlassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // var lassoed_data = this.state.lassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)

        // for(var i=0; i<unlassoed_data.data.length; i+=4){
        //     if(this.state.lasso.length>0){
        //         if(unlassoed_data.data[i+3]>0){
        //             origin_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
        //         }
        //     }
            
        //     if(lassoed_data.data[i+3]>0){
                
        //         moving_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
        //     }
        // }

        if(this.state.lasso.length>0){
            var xmax=Number.MIN_VALUE
            var ymax = Number.MIN_VALUE
            var xmin = Number.MAX_VALUE
            var ymin = Number.MAX_VALUE
            for(var i in this.state.lasso){
                var cur_p = this.state.lasso[i]
                if(cur_p[0]>xmax){
                    xmax = cur_p[0]
                }else if(cur_p[0]<xmin){
                    xmin = cur_p[0]
                }

                if(cur_p[1]>ymax){
                    ymax = cur_p[1]
                }else if(cur_p[1]<ymin){
                    ymin = cur_p[1]
                }
            }
            rotateCenter.push((xmin+xmax)/2)
            rotateCenter.push((ymin+ymax)/2)
        }else{
            rotateCenter.push(this.state.nonlasso_ret.left+this.state.nonlasso_ret.width/2)
            rotateCenter.push(this.state.nonlasso_ret.top+this.state.nonlasso_ret.height/2)
        }
        e.stopPropagation()
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        console.log('rot init')
        this.setState({action: 'rotate-layer', rotateCenter: rotateCenter, adjust_pre_canvas: adjust_pre_canvas, origin_image: cur_image, 
            // origin_ratioData, moving_ratioData
        })
    }

    rotateLayerMove(e){
        e.stopPropagation()
        var pos = this.getCurrentMouseOnBoard(e)

        var deg = this.angleBetween(pos, this.state.rotateCenter)
        console.log(deg)

        var adjust_pre_canvas = this.state.adjust_pre_canvas
        var adjust_pre_ctx = adjust_pre_canvas.getContext('2d')
        adjust_pre_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)
        // var lassoed_canvas = this.state.lassoed_canvas
        // var lassoed_ctx = lassoed_canvas.getContext('2d')


        var pos = this.getCurrentMouseOnBoard(e)

        adjust_pre_ctx.drawImage(this.state.unlassoed_canvas, 0, 0)

        adjust_pre_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
        adjust_pre_ctx.rotate(-deg)
        adjust_pre_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])
        adjust_pre_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        adjust_pre_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
        adjust_pre_ctx.rotate(deg)
        adjust_pre_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)

        ctx.drawImage(adjust_pre_canvas, 0, 0)

        this.setState({lasso_rot_deg: -deg*180/Math.PI, adjust_pre_canvas})

        // rotate drawing, lasso img
        
    }

    rotateLayerEnd(e){
        var lassoed_canvas = document.createElement('canvas')
        var lassoed_ctx = lassoed_canvas.getContext('2d')
        lassoed_canvas.width = this.state.lassoed_canvas.width
        lassoed_canvas.height = this.state.lassoed_canvas.height
        // lassoed_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        lassoed_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
        lassoed_ctx.rotate(this.state.lasso_rot_deg*Math.PI/180)
        lassoed_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])
        lassoed_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        lassoed_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
        lassoed_ctx.rotate(-this.state.lasso_rot_deg*Math.PI/180)
        lassoed_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var layers = this.state.layers
        layers[this.state.current_layer]['image'] = cur_image


        var adjust_pre_canvas = this.state.adjust_pre_canvas
        var adjust_pre_ctx = adjust_pre_canvas.getContext('2d');
        // var Data_t = adjust_pre_ctx.getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // var new_ratioData = this.state.origin_ratioData.slice()
        // console.log(adjust_pre_canvas.toDataURL())
        // console.log(Data_t.data)
        // for(var idx=0; idx<new_ratioData.length; idx++){
        //     if(Data_t.data[idx*4+3]>0){
        //         var w = idx%this.state.pixelwidth 
        //         var h = parseInt(idx/this.state.pixelwidth)

        //         var diff_w = w-this.state.rotateCenter[0]
        //         var diff_h = h-this.state.rotateCenter[1]

        //         var new_w = parseInt(this.state.rotateCenter[0]+ diff_w*Math.cos(this.state.lasso_rot_deg*Math.PI/180)+diff_h*Math.sin(this.state.lasso_rot_deg*Math.PI/180))
        //         var new_h = parseInt(this.state.rotateCenter[1]-diff_w*Math.sin(this.state.lasso_rot_deg*Math.PI/180)+diff_h*Math.cos(this.state.lasso_rot_deg*Math.PI/180))

        //         // console.log(new_w+new_h*this.state.pixelwidth, this.state.moving_ratioData[new_w+new_h*this.state.pixelwidth])
        //         new_ratioData[idx] = this.state.moving_ratioData[new_w+new_h*this.state.pixelwidth]
        //     }
        // }
        // this.state.ratioData[this.state.layers[this.state.current_layer].layer_id] = new_ratioData

        
        
        // console.image(lassoed_canvas.toDataURL())

        if(this.state.lasso.length>0){
            var lasso_img = document.createElement('canvas')
            var lasso_ctx = lasso_img.getContext('2d')
            lasso_img.width = this.state.lasso_img.width
            lasso_img.height = this.state.lasso_img.height

            lasso_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
            lasso_ctx.rotate(this.state.lasso_rot_deg*Math.PI/180)
            lasso_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])
            lasso_ctx.drawImage(this.state.lasso_img, 0, 0)
            lasso_ctx.translate(this.state.rotateCenter[0], this.state.rotateCenter[1])
            lasso_ctx.rotate(-this.state.lasso_rot_deg*Math.PI/180)
            lasso_ctx.translate(-this.state.rotateCenter[0], -this.state.rotateCenter[1])

            var deg = this.state.lasso_rot_deg/-180*Math.PI
            var new_lasso = []
            for(var i in this.state.lasso){
                var p = this.state.lasso[i]
                var dx = (p[0]-this.state.rotateCenter[0])
                var dy = (p[1]-this.state.rotateCenter[1])

                var nx = dx*Math.cos(deg)+dy*Math.sin(deg)+this.state.rotateCenter[0]
                var ny = -dx*Math.sin(deg)+dy*Math.cos(deg)+this.state.rotateCenter[1]
                new_lasso.push([nx, ny])
            }
            
            // TODO add a function?
            this.setState({action:'idle', rotateCenter:undefined, lasso_rot_deg: 0, lasso: new_lasso, lassoed_canvas, lasso_img: lasso_img}, ()=>{
                this.storeCurrentState('rotatelayer')
            })
        }else{
            // var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer]['layer_id'])
            var ctx = el.getContext('2d');
            var ret = this.getCanvasBoundingBox(ctx)
            
            // TODO add a function?
            this.setState({action:'idle', rotateCenter:undefined, lasso_rot_deg: 0, nonlasso_ret:ret, lassoed_canvas: lassoed_canvas}, ()=>{
                this.storeCurrentState('rotatelayer')
            })
        }
    }

    resizeLayerInit(direction, e){
        if(this.state.current_layer==-1){
            return
        }
        e.stopPropagation()
        console.log(direction)
        var ret
        var adjust_pre_canvas = document.createElement('canvas')
        adjust_pre_canvas.width = this.state.pixelwidth
        adjust_pre_canvas.height = this.state.pixelheight
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()

        // var origin_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
        // var moving_ratioData = new Array(this.state.pixelwidth*this.state.pixelheight).fill(0);
        // var unlassoed_data = this.state.unlassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)
        // var lassoed_data = this.state.lassoed_canvas.getContext('2d').getImageData(0,0,this.state.pixelwidth, this.state.pixelheight)

        // for(var i=0; i<unlassoed_data.data.length; i+=4){
        //     if(this.state.lasso.length>0){
        //         if(unlassoed_data.data[i+3]>0){
        //             // console.log(this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4])
        //             origin_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
        //         }
        //     }
            
        //     if(lassoed_data.data[i+3]>0){
                
        //         moving_ratioData[i/4] = this.state.ratioData[this.state.layers[this.state.current_layer].layer_id][i/4]
        //     }
        // }

        if(this.state.lasso.length>0){
            var xmax=Number.MIN_VALUE
            var ymax = Number.MIN_VALUE
            var xmin = Number.MAX_VALUE
            var ymin = Number.MAX_VALUE

            for(var i in this.state.lasso){
                var cur_p = this.state.lasso[i]
                if(cur_p[0]>xmax){
                    xmax = cur_p[0]
                }else if(cur_p[0]<xmin){
                    xmin = cur_p[0]
                }

                if(cur_p[1]>ymax){
                    ymax = cur_p[1]
                }else if(cur_p[1]<ymin){
                    ymin = cur_p[1]
                }
            }
            ret = {left: xmin, right: xmax, width: xmax-xmin, top: ymin, bottom: ymax, height: ymax-ymin}
        

            this.setState({lasso_resize_direction: direction, action: 'resize-layer', resize_layer_init_pos: this.getCurrentMouseOnBoard(e), 
            // origin_ratioData, moving_ratioData,    
            resize_ret: ret, init_lasso: this.state.lasso.slice(0), adjust_pre_canvas: adjust_pre_canvas, origin_image: cur_image})
        }else{
            ret = JSON.parse(JSON.stringify(this.state.nonlasso_ret))
            this.setState({lasso_resize_direction: direction, action: 'resize-layer', resize_layer_init_pos: this.getCurrentMouseOnBoard(e), 
            // origin_ratioData, moving_ratioData,     
            resize_ret: ret, init_resize_ret: ret, adjust_pre_canvas: adjust_pre_canvas, origin_image: cur_image})
        }
        
    }

    adjustResizeToRatio(pos){
        var init_x_name, init_y_name
        if(this.state.lasso_resize_direction=='se'){
            init_x_name = 'left'
            init_y_name = 'top'
        }else if(this.state.lasso_resize_direction=='sw'){
            init_x_name = 'right'
            init_y_name = 'top'
        }else if(this.state.lasso_resize_direction=='ne'){
            init_x_name = 'left'
            init_y_name = 'bottom'
        }else if(this.state.lasso_resize_direction=='nw'){
            init_x_name = 'right'
            init_y_name = 'bottom'
        }

        var init_x = this.state.resize_ret[init_x_name]
        var init_y = this.state.resize_ret[init_y_name]

        var cur_w = Math.abs(init_x-pos[0])
        var cur_h = Math.abs(init_y-pos[1])
        var cur_ratio = cur_h/cur_w

        var ideal_ratio = this.state.resize_ret['height']/this.state.resize_ret['width']

        if(cur_ratio > ideal_ratio){
            cur_h = ideal_ratio * cur_w
        }else{
            cur_w = cur_h / ideal_ratio
        }

        if(init_x>pos[0]){
            pos[0] = init_x-cur_w
        }else{
            pos[0] = init_x+cur_w
        }
        if(init_y>pos[1]){
            pos[1] = init_y-cur_h
        }else{
            pos[1] = init_y+cur_h
        }
     
        return pos

    }

    resizeLayerMove(e){
        e.stopPropagation()
        var pos = this.getCurrentMouseOnBoard(e)
        var init_pos = this.state.resize_layer_init_pos
        var resize_ret = this.state.resize_ret

        if(this.state.shift_pressed){
            if(this.state.lasso_resize_direction=='nw'||this.state.lasso_resize_direction=='ne'||this.state.lasso_resize_direction=='se'||this.state.lasso_resize_direction=='sw'){
            
                pos = this.adjustResizeToRatio(pos)
            
            }
            

            
        }

        // change what is drawn on the canvas
        var adjust_pre_canvas = this.state.adjust_pre_canvas
        var adjust_pre_ctx = adjust_pre_canvas.getContext('2d')
        adjust_pre_ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)
        

        
        if(this.state.lasso_resize_direction.indexOf('n')!=-1){
            var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
            adjust_pre_ctx.scale(1, scale)
            adjust_pre_ctx.translate(0, this.state.resize_ret['bottom']*(1/scale-1))
        }

        if(this.state.lasso_resize_direction.indexOf('s')!=-1){
            var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
            adjust_pre_ctx.scale(1, scale)
            adjust_pre_ctx.translate(0, this.state.resize_ret['top']*(1/scale-1))
        }
        if(this.state.lasso_resize_direction.indexOf('w')!=-1){
            var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
            adjust_pre_ctx.scale(scale, 1)
            adjust_pre_ctx.translate(this.state.resize_ret['right']*(1/scale-1), 0)
        }
        if(this.state.lasso_resize_direction.indexOf('e')!=-1){
            var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
            adjust_pre_ctx.scale(scale, 1)
            adjust_pre_ctx.translate(this.state.resize_ret['left']*(1/scale-1), 0)
        }
        adjust_pre_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        if(this.state.lasso_resize_direction.indexOf('n')!=-1){
            var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
            adjust_pre_ctx.translate(0, -this.state.resize_ret['bottom']*(1/scale-1))
            adjust_pre_ctx.scale(1, 1/scale);
        }
        if(this.state.lasso_resize_direction.indexOf('s')!=-1){
            var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
            adjust_pre_ctx.translate(0, -this.state.resize_ret['top']*(1/scale-1))
            adjust_pre_ctx.scale(1, 1/scale);
        }
        if(this.state.lasso_resize_direction.indexOf('w')!=-1){
            var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
            adjust_pre_ctx.translate(-this.state.resize_ret['right']*(1/scale-1),0)
            adjust_pre_ctx.scale(1/scale,1);
        }
        if(this.state.lasso_resize_direction.indexOf('e')!=-1){
            var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
            adjust_pre_ctx.translate(-this.state.resize_ret['left']*(1/scale-1),0)
            adjust_pre_ctx.scale(1/scale,1);
        }

        adjust_pre_ctx.globalCompositeOperation='destination-over'
        adjust_pre_ctx.drawImage(this.state.unlassoed_canvas, 0, 0)
        adjust_pre_ctx.globalCompositeOperation='source-over'


        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        ctx.clearRect(0,0,this.state.pixelwidth,this.state.pixelheight)
        ctx.drawImage(adjust_pre_canvas, 0, 0)

        if(this.state.lasso.length>0){
            // change lasso pos
            var lasso = []
            
            for (i in this.state.lasso){
                lasso.push([this.state.lasso[i][0], this.state.lasso[i][1]])
            }
            console.log(lasso[0][1], resize_ret)
            if(this.state.lasso_resize_direction.indexOf('n')!=-1){
                for(var i in lasso){
                    var new_height = resize_ret['height']-pos[1]+init_pos[1]
                    lasso[i][1] = resize_ret['bottom']-(new_height)/resize_ret['height']*(resize_ret['bottom']-this.state.init_lasso[i][1])
                }
            }

            if(this.state.lasso_resize_direction.indexOf('s')!=-1){
                for(var i in lasso){
                    var new_height = resize_ret['height']+pos[1]-init_pos[1]
                    lasso[i][1] = resize_ret['top']-(new_height)/resize_ret['height']*(resize_ret['top']-this.state.init_lasso[i][1])
                }
            }

            if(this.state.lasso_resize_direction.indexOf('e')!=-1){
                for(var i in lasso){
                    var new_height = resize_ret['width']+pos[0]-init_pos[0]
                    lasso[i][0] = resize_ret['left']-(new_height)/resize_ret['width']*(resize_ret['left']-this.state.init_lasso[i][0])
                }
            }

            if(this.state.lasso_resize_direction.indexOf('w')!=-1){
                for(var i in lasso){
                    var new_height = resize_ret['width']-pos[0]+init_pos[0]
                    lasso[i][0] = resize_ret['right']-(new_height)/resize_ret['width']*(resize_ret['right']-this.state.init_lasso[i][0])
                }
            }

            this.setState({lasso:lasso})
        }else{
            // change ret pos
            var ret = this.state.nonlasso_ret
            if(this.state.lasso_resize_direction.indexOf('n')!=-1){
                ret['height'] = resize_ret['height']-pos[1]+init_pos[1]
                ret['top'] = resize_ret['top']+pos[1]-init_pos[1]
            }
            if(this.state.lasso_resize_direction.indexOf('s')!=-1){
                ret['height'] = resize_ret['height']+pos[1]-init_pos[1]
                ret['bottom'] = resize_ret['bottom']-pos[1]+init_pos[1]
            }
            if(this.state.lasso_resize_direction.indexOf('e')!=-1){
                ret['width'] = resize_ret['width']+pos[0]-init_pos[0]
                ret['right'] = resize_ret['right']-pos[0]+init_pos[0]
            }
            if(this.state.lasso_resize_direction.indexOf('w')!=-1){
                ret['width'] = resize_ret['width']-pos[0]+init_pos[0]
                ret['left'] = resize_ret['left']+pos[0]-init_pos[0]
            }
            this.setState({nonlasso_ret:ret})
        }

        
        
    }

    resizeLayerEnd(e){
        var pos = this.getCurrentMouseOnBoard(e)
        if(this.state.shift_pressed){
            pos = this.adjustResizeToRatio(pos)
        }
        var init_pos = this.state.resize_layer_init_pos
        var resize_ret = this.state.resize_ret
        var lassoed_canvas = document.createElement('canvas')
        var lassoed_ctx = lassoed_canvas.getContext('2d')
        lassoed_canvas.width = this.state.lassoed_canvas.width
        lassoed_canvas.height = this.state.lassoed_canvas.height

        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var cur_image = el.toDataURL()
        var layers = this.state.layers
        layers[this.state.current_layer]['image'] = cur_image

        if(this.state.lasso_resize_direction.indexOf('n')!=-1){
            var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
            lassoed_ctx.scale(1, scale)
            lassoed_ctx.translate(0, this.state.resize_ret['bottom']*(1/scale-1))
        }

        if(this.state.lasso_resize_direction.indexOf('s')!=-1){
            var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
            lassoed_ctx.scale(1, scale)
            lassoed_ctx.translate(0, this.state.resize_ret['top']*(1/scale-1))
        }
        if(this.state.lasso_resize_direction.indexOf('w')!=-1){
            var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
            lassoed_ctx.scale(scale, 1)
            lassoed_ctx.translate(this.state.resize_ret['right']*(1/scale-1), 0)
        }
        if(this.state.lasso_resize_direction.indexOf('e')!=-1){
            var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
            lassoed_ctx.scale(scale, 1)
            lassoed_ctx.translate(this.state.resize_ret['left']*(1/scale-1), 0)
        }
        lassoed_ctx.drawImage(this.state.lassoed_canvas, 0, 0)
        if(this.state.lasso_resize_direction.indexOf('n')!=-1){
            var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
            lassoed_ctx.translate(0, -this.state.resize_ret['bottom']*(1/scale-1))
            lassoed_ctx.scale(1, 1/scale);
        }
        if(this.state.lasso_resize_direction.indexOf('s')!=-1){
            var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
            lassoed_ctx.translate(0, -this.state.resize_ret['top']*(1/scale-1))
            lassoed_ctx.scale(1, 1/scale);
        }
        if(this.state.lasso_resize_direction.indexOf('w')!=-1){
            var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
            lassoed_ctx.translate(-this.state.resize_ret['right']*(1/scale-1),0)
            lassoed_ctx.scale(1/scale,1);
        }
        if(this.state.lasso_resize_direction.indexOf('e')!=-1){
            var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
            lassoed_ctx.translate(-this.state.resize_ret['left']*(1/scale-1),0)
            lassoed_ctx.scale(1/scale,1);
        }


        if(this.state.lasso.length>0){
            var lasso_img = document.createElement('canvas')
            var lasso_ctx = lasso_img.getContext('2d')
            lasso_img.width = this.state.lasso_img.width
            lasso_img.height = this.state.lasso_img.height

            if(this.state.lasso_resize_direction.indexOf('n')!=-1){
                var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
                lasso_ctx.scale(1, scale)
                lasso_ctx.translate(0, this.state.resize_ret['bottom']*(1/scale-1))
            }
    
            if(this.state.lasso_resize_direction.indexOf('s')!=-1){
                var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
                lasso_ctx.scale(1, scale)
                lasso_ctx.translate(0, this.state.resize_ret['top']*(1/scale-1))
            }
            if(this.state.lasso_resize_direction.indexOf('w')!=-1){
                var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
                lasso_ctx.scale(scale, 1)
                lasso_ctx.translate(this.state.resize_ret['right']*(1/scale-1), 0)
            }
            if(this.state.lasso_resize_direction.indexOf('e')!=-1){
                var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
                lasso_ctx.scale(scale, 1)
                lasso_ctx.translate(this.state.resize_ret['left']*(1/scale-1), 0)
            }
            lasso_ctx.drawImage(this.state.lasso_img, 0, 0)
            if(this.state.lasso_resize_direction.indexOf('n')!=-1){
                var scale = (resize_ret['height']-pos[1]+init_pos[1])/resize_ret['height']
                lasso_ctx.translate(0, -this.state.resize_ret['bottom']*(1/scale-1))
                lasso_ctx.scale(1, 1/scale);
            }
            if(this.state.lasso_resize_direction.indexOf('s')!=-1){
                var scale = (resize_ret['height']+pos[1]-init_pos[1])/resize_ret['height']
                lasso_ctx.translate(0, -this.state.resize_ret['top']*(1/scale-1))
                lasso_ctx.scale(1, 1/scale);
            }
            if(this.state.lasso_resize_direction.indexOf('w')!=-1){
                var scale = (resize_ret['width']-pos[0]+init_pos[0])/resize_ret['width']
                lasso_ctx.translate(-this.state.resize_ret['right']*(1/scale-1),0)
                lasso_ctx.scale(1/scale,1);
            }
            if(this.state.lasso_resize_direction.indexOf('e')!=-1){
                var scale = (resize_ret['width']+pos[0]-init_pos[0])/resize_ret['width']
                lasso_ctx.translate(-this.state.resize_ret['left']*(1/scale-1),0)
                lasso_ctx.scale(1/scale,1);
            }

            // TODO add a function?
            this.setState({action: 'idle', lassoed_canvas: lassoed_canvas, lasso_img:lasso_img,
            lasso_resize_direction:undefined,resize_layer_init_pos:undefined, resize_ret:undefined, init_lasso:undefined, adjust_pre_canvas:undefined}, ()=>{
                this.storeCurrentState('resizelayer')
            })
        }else{
            var ctx = el.getContext('2d');
            var ret = this.getCanvasBoundingBox(ctx)
            
            // TODO add a function?
            this.setState({action: 'idle', lassoed_canvas: lassoed_canvas, nonlasso_ret: ret,
            lasso_resize_direction:undefined,resize_layer_init_pos:undefined, resize_ret:undefined, init_lasso:undefined, adjust_pre_canvas:undefined}, ()=>{
                this.storeCurrentState('resizelayer')
            })
        }

    }


    renderCanvas(){
        return this.state.layers.map((layer, idx)=>{
            return <CanvasBody key={'sketchpad_canvas'+layer.layer_id} canvas_id={layer.layer_id} canvas_idx={idx} mother_state={this.state}></CanvasBody>
        }).reverse()
    }

    renderAdjuster(){
        if(this.state.control_state=='move-layer'){
            if(this.state.lasso.length>0){
                var xmax=Number.MIN_VALUE
                var ymax = Number.MIN_VALUE
                var xmin = Number.MAX_VALUE
                var ymin = Number.MAX_VALUE

                for(var i in this.state.lasso){
                    var cur_p = this.state.lasso[i]
                    if(cur_p[0]>xmax){
                        xmax = cur_p[0]
                    }else if(cur_p[0]<xmin){
                        xmin = cur_p[0]
                    }

                    if(cur_p[1]>ymax){
                        ymax = cur_p[1]
                    }else if(cur_p[1]<ymin){
                        ymin = cur_p[1]
                    }
                }
                // console.log(xmin, ymin)
                var xcenter = (xmin+xmax)/this.state.pixelwidth/2*this.state.boardwidth*this.state.boardzoom
                var ycenter = (ymin+ymax)/this.state.pixelheight/2*this.state.boardheight*this.state.boardzoom
                return (<g style={{transformOrigin: xcenter+'px '+ycenter+'px', transform: 'rotate('+this.state.lasso_rot_deg+'deg)'}}>
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={(xmax-xmin)/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={(ymax-ymin)/this.state.pixelheight*this.state.boardheight*this.state.boardzoom}
                     style={{fill:'transparent', stroke:'#333333', strokeDasharray:"5,5", cursor: 'move'}}
                     onPointerDown={this.moveLayerInit.bind(this)}>
                    </rect>
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={(xmax-xmin)/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={10}
                    style={{fill:'transparent', cursor:'n-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'n')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={(xmax-xmin)/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={10}
                    style={{fill:'transparent', cursor:'s-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 's')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={(ymax-ymin)/this.state.pixelheight*this.state.boardheight*this.state.boardzoom}
                    style={{fill:'transparent', cursor:'w-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'w')}
                    ></rect>
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={(ymax-ymin)/this.state.pixelheight*this.state.boardheight*this.state.boardzoom}
                    style={{fill:'transparent', cursor:'e-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'e')}
                    ></rect> 

                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={10}
                    style={{fill:'white', cursor:'nw-resize', stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'nw')}
                    ></rect> 
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={10}
                    style={{fill:'white', cursor:'ne-resize', stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'ne')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={10} height={10}
                    style={{fill:'white', cursor:'sw-resize', stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'sw')}
                    ></rect> 
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={10} height={10}
                    style={{fill:'white', cursor:'se-resize', stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'se')}
                    ></rect> 

                    <rect x={(xmax+xmin)/this.state.pixelwidth/2*this.state.boardwidth*this.state.boardzoom-5} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-30} width={10} height={10}
                        style={{fill:'white', stroke:'#333333', cursor:'rotate'}} onPointerDown={this.rotateLayerInit.bind(this)}
                    ></rect> 
                </g>)
            }else if(this.state.nonlasso_ret!=undefined){
                var ret = this.state.nonlasso_ret
                var xmin = ret.left
                var xmax = ret.left+ret.width
                var ymin = ret.top
                var ymax = ret.top+ret.height
                var xcenter = (xmin+xmax)/2/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom
                var ycenter = (ymin+ymax)/2/this.state.pixelheight*this.state.boardheight*this.state.boardzoom
                return (<g style={{transformOrigin: xcenter+'px '+ycenter+'px', transform: 'rotate('+this.state.lasso_rot_deg+'deg)'}}>
                    <rect x={ret.left/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ret.top/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={ret.width/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={ret.height/this.state.pixelheight*this.state.boardheight*this.state.boardzoom}
                     style={{fill:'transparent', stroke:'#333333', strokeDasharray:"5,5", cursor: 'move'}}
                     onPointerDown={this.moveLayerInit.bind(this)}>
                    </rect>

                    {/* <rect x={xmin/1000*this.state.boardlength*this.state.boardzoom} y={ymin/1000*this.state.boardlength*this.state.boardzoom} width={(xmax-xmin)/1000*this.state.boardlength*this.state.boardzoom} height={(ymax-ymin)/1000*this.state.boardlength*this.state.boardzoom}
                     style={{fill:'transparent', stroke:'#333333', strokeDasharray:"5,5", cursor: 'move'}}
                     onPointerDown={this.moveLayerInit.bind(this)}>
                    </rect> */}
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={(xmax-xmin)/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={10}
                    style={{fill:'transparent', cursor:'n-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'n')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={(xmax-xmin)/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} height={10}
                    style={{fill:'transparent', cursor:'s-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 's')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={(ymax-ymin)/this.state.pixelheight*this.state.boardwidth*this.state.boardzoom}
                    style={{fill:'transparent', cursor:'w-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'w')}
                    ></rect>
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={(ymax-ymin)/this.state.pixelheight*this.state.boardwidth*this.state.boardzoom}
                    style={{fill:'transparent', cursor:'e-resize'}} onPointerDown={this.resizeLayerInit.bind(this, 'e')}
                    ></rect> 

                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={10}
                    style={{fill:'white', cursor:'nw-resize', stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'nw')}
                    ></rect> 
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom} width={10} height={10}
                    style={{fill:'white', cursor:'ne-resize',stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'ne')}
                    ></rect> 
                    <rect x={xmin/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={10} height={10}
                    style={{fill:'white', cursor:'sw-resize',stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'sw')}
                    ></rect> 
                    <rect x={xmax/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-10} y={ymax/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-10} width={10} height={10}
                    style={{fill:'white', cursor:'se-resize',stroke:'#333333'}} onPointerDown={this.resizeLayerInit.bind(this, 'se')}
                    ></rect> 

                    <rect x={(xmax+xmin)/2/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom-5} y={ymin/this.state.pixelheight*this.state.boardheight*this.state.boardzoom-30} width={10} height={10}
                        style={{fill:'white', stroke:'#333333', cursor:'rotate'}} onPointerDown={this.rotateLayerInit.bind(this)}
                    ></rect> 
                </g>)
            }
    
        }
    }

    renderLasso(){
        if(this.state.lasso.length!=0){
            var path = "M"
            for(var i in this.state.lasso){
                var cur_point = this.state.lasso[i]
                path = path+(cur_point[0]/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom).toString()+' '+(cur_point[1]/this.state.pixelheight*this.state.boardheight*this.state.boardzoom).toString()
                if(i!=this.state.lasso.length-1){
                    path = path+' L'
                }else{
                    path = path+' Z'
                }
            }
            if(this.state.lasso_rot_deg!=0){

                return (<g style={{transformOrigin: this.state.rotateCenter[0]/this.state.pixelwidth*this.state.boardwidth*this.state.boardzoom+'px '+this.state.rotateCenter[1]/this.state.pixelheight*this.state.boardheight*this.state.boardzoom+'px', transform: 'rotate('+this.state.lasso_rot_deg+'deg)'}}>
                    <path 
                    d={path} fill='transparent' stroke='white' strokeDasharray='5, 2' strokeWidth={4}></path>
                    <path 
                    d={path} fill='transparent' stroke='#333333' strokeDasharray='5, 2' strokeWidth={2}></path>
                </g>
                )
            }else{
                return (<g>
                    <path 
                    d={path} fill='transparent' stroke='white' strokeDasharray='5, 2' strokeWidth={4}></path>
                    <path 
                    d={path} fill='transparent' stroke='#333333' strokeDasharray='5, 2' strokeWidth={2}></path>
                </g>)
            }
            
        }
    }

    initializeMoveLayer(){
        var el = document.getElementById('sketchpad_canvas_'+this.state.layers[this.state.current_layer].layer_id)
        var ctx = el.getContext('2d');
        console.log('init!!')
        if(this.state.lasso_img!=undefined){
            var lassoed_canvas = document.createElement('canvas')
            lassoed_canvas.width =this.state.pixelwidth
            lassoed_canvas.height=this.state.pixelheight
            var lassoed_ctx = lassoed_canvas.getContext('2d')

            var unlassoed_canvas = document.createElement('canvas')
            unlassoed_canvas.width =this.state.pixelwidth
            unlassoed_canvas.height=this.state.pixelheight
            var unlassoed_ctx = unlassoed_canvas.getContext('2d')

            lassoed_ctx.drawImage(el,0,0)
            unlassoed_ctx.drawImage(el,0,0)

            lassoed_ctx.globalCompositeOperation='destination-in'
            unlassoed_ctx.globalCompositeOperation = 'destination-out'

            lassoed_ctx.drawImage(this.state.lasso_img,0,0)
            unlassoed_ctx.drawImage(this.state.lasso_img,0,0)
            this.setState({lassoed_canvas: lassoed_canvas, unlassoed_canvas: unlassoed_canvas});
        }else{
            var lassoed_canvas = document.createElement('canvas')
            lassoed_canvas.width =this.state.pixelwidth
            lassoed_canvas.height=this.state.pixelheight
            var lassoed_ctx = lassoed_canvas.getContext('2d')
            lassoed_ctx.drawImage(el,0,0)

            var unlassoed_canvas = document.createElement('canvas')
            unlassoed_canvas.width =this.state.pixelwidth
            unlassoed_canvas.height=this.state.pixelheight

            var ret = this.getCanvasBoundingBox(ctx)
            console.log(ret)
            if(ret==false){
                this.setState({lassoed_canvas: lassoed_canvas, unlassoed_canvas: unlassoed_canvas, nonlasso_ret: undefined});
            }else{
                this.setState({lassoed_canvas: lassoed_canvas, unlassoed_canvas: unlassoed_canvas, nonlasso_ret: ret});
            }
            
        }


    }

    // initializeContentStamp(){

    // }

    getCanvasBoundingBox(ctx, left=0, top=0, width=this.state.pixelwidth, height=this.state.pixelheight){
        var ret = {};
    
        // Get the pixel data from the canvas
        var data = ctx.getImageData(left, top, width, height).data;
        console.log(data);
        var first = false; 
        var last = false;
        var right = false;
        var left = false;
        var r = height;
        var w = 0;
        var c = 0;
        var d = 0;

        // 1. get bottom
        while(!last && r) {
            r--;
            for(c = 0; c < width; c++) {
                if(data[r * width * 4 + c * 4 + 3]) {
                    console.log('last', r);
                    last = r+1;
                    ret.bottom = r+1;
                    break;
                }
            }
        }

        // 2. get top
        r = 0;
        var checks = [];
        while(!first && r < last) {
            
            for(c = 0; c < width; c++) {
                if(data[r * width * 4 + c * 4 + 3]) {
                    console.log('first', r);
                    first = r-1;
                    ret.top = r-1;
                    ret.height = last - first;
                    break;
                }
            }
            r++;
        }

        // 3. get right
        c = width;
        while(!right && c) {
            c--;
            for(r = 0; r < height; r++) {
                if(data[r * width * 4 + c * 4 + 3]) {
                    console.log('last', r);
                    right = c+1;
                    ret.right = c+1;
                    break;
                }
            }
        }

        // 4. get left
        c = 0;
        while(!left && c < right) {

            for(r = 0; r < height; r++) {
                if(data[r * width * 4 + c * 4 + 3]) {
                    console.log('left', c-1);
                    left = c;
                    ret.left = c;
                    ret.width = right - left;
                    break;
                }
            }
            c++;
            
            // If we've got it then return the height
            if(left) {
                return ret;    
            }
        }

        // We screwed something up...  What do you expect from free code?
        return false;
    }



    collapseSketchpad(){
        var boardstate = this.props.board_this.state
        if(boardstate.moodboard_collapsed==false && boardstate.sketchpad_collapsed==false){
            this.props.board_this.setState({moodboard_collapsed:false, sketchpad_collapsed: true})

        }else if(boardstate.moodboard_collapsed==true && boardstate.sketchpad_collapsed==false){
            this.props.board_this.setState({moodboard_collapsed:false, sketchpad_collapsed: false})
        }
    }

    renderBrushMark(){
        var height = this.state.brush_size/this.state.pixelheight*this.state.boardheight*this.state.boardzoom
        
        return (<img src={window.location.protocol+'//'+window.location.host+'/img/circle.png'} style={{height: height, position:'absolute', zorder:10, pointerEvents: 'none', top: this.state.cur_mouse_pos[1]-height/2, left: this.state.cur_mouse_pos[0]-height/2}}></img>)
        // return (<img src={location.protocol+'//'+location.host+'/img/brush.png'} style={{height: height, position:'absolute', zorder:100000, pointerEvents: 'none', top: this.state.cur_mouse_pos[1]-height/2, left: this.state.cur_mouse_pos[0]-height/2}}></img>)
    }

    renderEraserMark(){
        var height = this.state.erase_size/this.state.pixelheight*this.state.boardheight*this.state.boardzoom
        return (<div style={{border: 'solid 1px black', borderRadius: '50%', height:height, width: height, position:'absolute', zorder: 10, pointerEvents:'none', top: this.state.cur_mouse_pos[1]-height/2, left: this.state.cur_mouse_pos[0]-height/2}}></div>)
        // return (<img src={location.protocol+'//'+location.host+'/img/brush.png'} style={{height: height, position:'absolute', zorder:100000, pointerEvents: 'none', top: this.state.cur_mouse_pos[1]-15, left: this.state.cur_mouse_pos[0]-15}}></img>)
    }

    renderAIBrushMark(){
        var height = this.state.AI_brush_size/this.state.pixelheight*this.state.boardheight*this.state.boardzoom
        return (<div style={{border: 'solid 1px black', borderRadius: '50%', height:height, width: height, position:'absolute', zorder: 10, pointerEvents:'none', top: this.state.cur_mouse_pos[1]-height/2, left: this.state.cur_mouse_pos[0]-height/2}}></div>)
        // return (<img src={location.protocol+'//'+location.host+'/img/brush.png'} style={{height: height, position:'absolute', zorder:100000, pointerEvents: 'none', top: this.state.cur_mouse_pos[1]-15, left: this.state.cur_mouse_pos[0]-15}}></img>)
    }

    render(){

        var panel_size = ' s12 ' 
        var horizontal_offset = 0
        // if(this.props.board_this.state.moodboard_collapsed==true && this.props.board_this.state.sketchpad_collapsed==false){
        //     panel_size = ' s12 '
        //     horizontal_offset = this.state.boardwidth/2
        // }

        return (<div className={'col '+panel_size+' oneboard'} style={{height:'100%'}}>
        <div id='sketchpad' className='sketchpad select_disabled' onWheel={this.zoom_board_wheel.bind(this)} 
            // onPointerOut={this.moveBoardEnd.bind(this)}
            onPointerUp={this.sketchPadMouseMoveEnd.bind(this)} 
            onPointerMove={this.sketchPadMouseMove.bind(this)}> 
            <div className={'boardrender'} onPointerDown={this.sketchPadMouseMoveInit.bind(this)} onPointerUp={this.sketchPadMouseMoveEnd.bind(this)} onContextMenu={this.sketchPadContextMenu.bind(this)}
                // onPointerOut={this.sketchPadMouseMoveOut.bind(this)}
                // onPointerOut={this.props.board_this.setSketchpadPosition.bind(this.props.board_this, -1, -1)}

            
            style={{
                width:this.state.boardzoom*this.state.boardwidth, 
                height: this.state.boardzoom*this.state.boardheight,
                top: this.state.boardheight/2-this.state.boardzoom*this.state.boardheight*this.state.boardcenter[1],
                left: horizontal_offset+this.state.boardwidth/2-this.state.boardzoom*this.state.boardwidth*this.state.boardcenter[0],
            }}>
                <canvas id='checkerboard' width={this.state.pixelwidth} height={this.state.pixelheight} style={{width: '100%', position:'absolute', top:'0', left: '0'}}></canvas>
                
                {this.renderCanvas()}
                <AIDrawCanvas ref={this.AIDrawCanvas} mother_state={this.state} mother_this={this}></AIDrawCanvas>
                <svg id='sketch_pad_svg' width={this.state.boardzoom*this.state.boardwidth} height={this.state.boardzoom*this.state.boardheight} style={{position: 'absolute', top: '0', left: '0'}}>
             
                    {(this.state.control_state!='content-stamp' && this.state.control_state!='style-stamp') && this.renderLasso()}
                </svg>
                <canvas id='temp_canvas' width={this.state.pixelwidth} height={this.state.pixelheight} style={{width: '100%', position:'absolute', top:'0', left: '0'}}></canvas>
                <svg id='sketch_pad_svg2' width={this.state.boardzoom*this.state.boardwidth} height={this.state.boardzoom*this.state.boardheight} style={{position: 'absolute', top: '0', left: '0'}}>
                    {this.renderAdjuster()}
                    {/* {this.renderLasso()} */}
                </svg>
                {/* {this.props.board_this.renderCollaboratorsOnSketchpad()} */}
                
            </div>
            <div style={{visibility: (this.state.control_state!='AI')?"hidden":"", pointerEvents: (this.state.control_state!='AI')?"none":""}}>
                <PromptController ref={this.PromptController} mother_state={this.state} mother_this={this}></PromptController>
            </div>
            <div style={{visibility: (this.state.control_state!='AI')?"hidden":"", pointerEvents: (this.state.control_state!='AI')?"none":""}}>
                <GenerationController mother_state={this.state} mother_this={this}></GenerationController>
            </div>
            
            <MainController mother_state={this.state} mother_this={this}></MainController>
            {/* <LayerController mother_state={this.state} mother_this={this}></LayerController> */}
            
            {/* <SketchpadUndo mother_state={this.state} mother_this={this}></SketchpadUndo> */}
        </div>
        {this.state.control_state=='brush' && this.state.action=='brush' && this.renderBrushMark()}
        {this.state.control_state=='erase' && this.state.action=='erase' && this.renderEraserMark()}
        {this.state.control_state=='AI' && this.state.action=='AI_brush' && this.renderAIBrushMark()}
    </div>)
    }
}

export default Canvas