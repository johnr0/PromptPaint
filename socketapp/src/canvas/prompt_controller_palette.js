import React from 'react'
import {create, all} from 'mathjs'
import M from 'materialize-css'

class PromptControllerPalette extends React.Component{

    state={
        action:'idle',
        control_action: 'idle',
        step: 40,
        current_prompt: -1,
        palette_fix: false,

        prompt_update_tick: false,
        log_tick: false,   
    }

    componentDidMount(){
        this.math = create(all, {})
        var _this = this
        setTimeout(function(){
            _this.draw3DMix()
        },50)

        const rO = new ResizeObserver((entries)=>{
            _this.draw3DMix()
        })
        rO.observe(document.getElementById('prompt_palette_board'))

    }

    componentDidUpdate(){
        if(this.state.current_prompt!=-1){
            var activate = false
            for(var i in this.props.mother_state.prompt_groups){
                if(this.props.mother_state.prompt_groups[i].indexOf(this.state.current_prompt)!=-1 &&this.props.mother_state.prompt_groups[i].length==3){
                    activate=true
                }
            }
            if(activate){
                this.draw3DMix()
            }   
            
        }
        

    
    }

    setSinglePrompt(idx){
        var selected_prompt={
            position: this.props.mother_state.prompts[idx].position,
            prompts: [idx],
            weights: [1],
        }
        var _this = this
        this.props.mother_this.setState({selected_prompt:selected_prompt}, function(){
            
            _this.sendUpdatePromptText()
        })
    }

    pDistance(x, y, x1, y1, x2, y2) {

        var A = x - x1;
        var B = y - y1;
        var C = x2 - x1;
        var D = y2 - y1;
        
        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1;
        if (len_sq != 0) //in case of 0 length line
            param = dot / len_sq;
        
        var xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        var dx = x - xx;
        var dy = y - yy;
        return [dx, dy];
    }

    setDoublePrompt(val, idx, e){
        var prompt1 = this.props.mother_state.prompts[val[0]]
        var prompt2 = this.props.mother_state.prompts[val[1]]

        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null){
            return
        }
        var palette_x = palette_el.getBoundingClientRect().x
        var palette_y = palette_el.getBoundingClientRect().y
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        var x = e.pageX-palette_x
        var y = e.pageY-palette_y

        var x1 = prompt1.position[0] * palette_width
        var y1 = prompt1.position[1] * palette_height

        var x2 = prompt2.position[0] * palette_width
        var y2 = prompt2.position[1] * palette_height

        var pDist = this.pDistance(x, y, x1, y1, x2, y2)

        var len1 = Math.sqrt((x1-x)*(x1-x) + (y1-y)*(y1-y))
        var len2 = Math.sqrt((x2-x)*(x2-x) + (y2-y)*(y2-y))
        
        var w1 = len2/(len1+len2)
        var w2 = len1/(len1+len2)
        var selected_prompt={
            position: [x/palette_width, y/palette_height],
            side: pDist, 
            prompts: [val[0], val[1]],
            weights: [w1, w2],
        }
        var _this = this
        this.props.mother_this.setState({selected_prompt:selected_prompt}, function(){
            _this.sendUpdatePromptText()
        })
        this.setState({})
    }

    setTriplePrompt(val, idx, e){
        var prompt1 = this.props.mother_state.prompts[val[0]]
        var prompt2 = this.props.mother_state.prompts[val[1]]
        var prompt3 = this.props.mother_state.prompts[val[2]]

        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null){
            return
        }
        var palette_x = palette_el.getBoundingClientRect().x
        var palette_y = palette_el.getBoundingClientRect().y
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        var x = e.pageX-palette_x
        var y = e.pageY-palette_y

        var x1 = prompt1.position[0] * palette_width
        var y1 = prompt1.position[1] * palette_height

        var x2 = prompt2.position[0] * palette_width
        var y2 = prompt2.position[1] * palette_height

        var x3 = prompt3.position[0] * palette_width
        var y3 = prompt3.position[1] * palette_height

        var matmul_result = this.math.multiply(this.math.inv([[x1,x2,x3], [y1,y2,y3], [1,1,1]]), [x, y, 1])
        var selected_prompt={
            position: [x/palette_width, y/palette_height],
            prompts: [val[0], val[1], val[2]],
            weights: matmul_result,
        }
        var _this = this
        this.props.mother_this.setState({selected_prompt:selected_prompt}, function(){
            _this.sendUpdatePromptText()
        })
        this.setState({})

    }

    sendUpdatePromptText(){
        if(this.state.log_tick==false){
            var _this =this
            this.setState({log_tick: true})
            setTimeout(function(){
                _this.props.mother_this.storeCurrentState('Update prompt palette target')
                _this.setState({log_tick: false})
            }, 200)
        }
        

        if(this.props.mother_state.gen_start==false && this.props.mother_state.single_stroke_ratio==0 && this.props.mother_state.stroke_id!=undefined){
            // start gen
            console.log('start!', this.props.mother_state.gen_steps, this.props.mother_state.gen_tick)
            this.props.mother_this.AIDrawCanvas.current.initGen2(this.props.mother_state.gen_tick, 100, true)
            this.props.mother_this.setState({gen_start:true})
        }

        if(this.state.prompt_update_tick==false){
            if(this.props.mother_state.gen_start){
                
                console.log('prompt updated during generation')
                var text_prompts = []
                var text_prompt_weights = []
                for(var i in this.props.mother_state.selected_prompt.prompts){
                    var prompt_idx = this.props.mother_state.selected_prompt.prompts[i]
                    var prompt = this.props.mother_state.prompts[prompt_idx]
                    if(prompt.istext){
                        text_prompts.push(prompt.prompt)
                        text_prompt_weights.push(this.props.mother_state.selected_prompt.weights[i])
                    }
                }
                
                this.props.mother_this.AIDrawCanvas.current.socket.emit('prompts_update', {
                    'stroke_id': this.props.mother_state.stroke_id, 
                    'text_prompts': text_prompts,
                    'text_prompt_weights': text_prompt_weights,
                    'prompts_proto': JSON.parse(JSON.stringify(this.props.mother_state.prompts)), 
                    'selected_prompts_proto': JSON.parse(JSON.stringify(this.props.mother_state.selected_prompt)),
    
                })
                var _this = this
                this.setState({prompt_update_tick: true}, function(){
                    
                    setTimeout(function(){
                        _this.setState({prompt_update_tick: false})
                    }, 200)
                })
            }
        }   
        
    }

    toggleFix(){
        this.setState({palette_fix:!this.state.palette_fix})
    }

    initMovePrompt(idx){
        if(this.state.palette_fix==false){
            this.setState({current_prompt: idx, action:'move_prompt'})
        }
        this.setSinglePrompt(idx)
        
    }

    downPointer(){
        this.setState({control_action:'control'})
    }

    movePointer(e){
        if(this.state.action=='move_prompt'){
            this.setSinglePrompt(this.state.current_prompt)
            this.movePrompt(e)
        }
    }

    endPointer(e){
        if(this.state.action=='move_prompt'){
            this.setState({action:'idle', current_prompt: -1})
        }
        this.setState({control_action:'idle'})
        if(this.props.mother_state.gen_start && this.props.mother_state.single_stroke_ratio==0 && this.props.mother_state.stroke_id!=undefined){
            // end gen
            console.log('end!')
            this.props.mother_this.AIDrawCanvas.current.socket.emit('gen_stop', {'stroke_id': this.props.mother_state.stroke_id})
            this.props.mother_this.setState({gen_start:false})
        }
    }

    movePrompt(e){
        e.stopPropagation()
        var palette_el = document.getElementById('prompt_palette_board')
        var palette_x = palette_el.getBoundingClientRect().x
        var palette_y = palette_el.getBoundingClientRect().y
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height
        var x = (e.pageX-palette_x)/palette_width
        var y = (e.pageY-palette_y)/palette_height

        this.props.mother_state.prompts[this.state.current_prompt].position = [x, y]
        this.props.mother_this.setState({})
    }

    renderMix2(){
        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null || this.props.mother_state.prompt_groups==undefined){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height
        return this.props.mother_state.prompt_groups.map((val, idx)=>{
            if(val.length==2){
                
                var prompt1 = this.props.mother_state.prompts[val[0]]
                var prompt2 = this.props.mother_state.prompts[val[1]]
                if(prompt1==undefined || prompt2==undefined){
                    return
                }
                var x = palette_width * prompt1.position[0]-20
                var y = palette_height * prompt1.position[1]
                var height = Math.sqrt(palette_width *palette_width *(prompt1.position[0]-prompt2.position[0])*(prompt1.position[0]-prompt2.position[0])+palette_height * palette_height *(prompt1.position[1]-prompt2.position[1])*(prompt1.position[1]-prompt2.position[1]))
                var angleDeg = -Math.atan2(palette_width *(prompt2.position[0] - prompt1.position[0]), palette_height *(prompt2.position[1] - prompt1.position[1])) * 180 / Math.PI;
                return (<g key={'mix2_'+idx}>
                    <defs>
                    <linearGradient id={"Gradient_"+idx} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={prompt1.color}/>
                        <stop offset="100%" stopColor={prompt2.color}/>
                    </linearGradient>
                    </defs>
                    <rect x={x} y={y} width={40} stroke={'white'} strokeWidth={2} fill={"url(#Gradient_"+idx+')'} height={height} 
                    style={{transformBox: 'fill-box', transformOrigin:'top center', transform: 'rotate('+angleDeg+'deg)'}}
                    onPointerEnter={this.mix2Enter.bind(this, val, idx)} onPointerDown={this.mix2Down.bind(this,val,idx)} 
                    onPointerMove={this.mix2Move.bind(this,val,idx)}></rect>
                </g>)
            }else{
                return
            }
        })
    }

    mix2Enter(val, idx, e){
        if(this.state.control_action=='control'){
            this.setDoublePrompt(val, idx, e)
        }
        this.combine3(val, idx)
    }

    mix2Down(val, idx, e){
        this.setDoublePrompt(val, idx, e)
    }

    mix2Move(val, idx, e){
        if(this.state.control_action=='control'){
            this.setDoublePrompt(val, idx, e)
        }

    }


    combine3(val, idx){
        if(this.state.current_prompt!=-1 && this.state.action=='move_prompt'){
            if(val.indexOf(this.state.current_prompt)==-1){
                if(this.combineCheck(this.props.mother_state.prompt_groups[idx])==false){
                    this.props.mother_state.prompt_groups[idx].push(this.state.current_prompt)
                    this.props.mother_this.setState({}, ()=>{
                        this.props.mother_this.storeCurrentState('Update prompt palette combine3')
                    })
                }
                
            }
        }
    }

    sign(p1, p2, p3){
        return (p1[0]-p3[0])*(p2[1]-p3[1])-(p2[0]-p3[0])*(p1[1]-p3[1]);
    }

    pointInTriangle(pt, v1, v2, v3){
        var d1 = this.sign(pt, v1, v2)
        var d2 = this.sign(pt, v2, v3)
        var d3 = this.sign(pt, v3, v1)

        var has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0)
        var has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0)

        return !(has_neg && has_pos)
    }

    interpolateColors(colors, amount) { 

        var rr=0, rg=0, rb=0

        for(var i in amount){
            var ah = +colors[i].replace('#', '0x'),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff
            rr = rr+ ar*amount[i] 
            rg = rg+ ag*amount[i]
            rb = rb+ ab*amount[i]
        }
    
        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    }

    draw3DMix(){
        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null || this.props.mother_state.prompt_groups==undefined){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        return this.props.mother_state.prompt_groups.map((val, idx)=>{
            if(val.length==3){
                
                var canvas = document.getElementById('mix3_'+idx)
                if(canvas==null){
                    return
                }
                var ctx = canvas.getContext('2d')
                ctx.clearRect(0,0,palette_width, palette_height)

                var prompt1 = this.props.mother_state.prompts[val[0]]
                var prompt2 = this.props.mother_state.prompts[val[1]]
                var prompt3 = this.props.mother_state.prompts[val[2]]

                var x1 = palette_width * prompt1.position[0]
                var y1 = palette_height * prompt1.position[1]
                var x2 = palette_width * prompt2.position[0]
                var y2 = palette_height * prompt2.position[1]
                var x3 = palette_width * prompt3.position[0]
                var y3 = palette_height * prompt3.position[1]

                var xmin = Math.min(x1,x2,x3)
                var xmax = Math.max(x1,x2,x3)

                var ymin = Math.min(y1,y2,y3)
                var ymax = Math.max(y1,y2,y3)

                var step = 3

                var pixels = []
                for(var cur_x=xmin; cur_x<=xmax; cur_x=cur_x+step){
                    for(var cur_y=ymin; cur_y<=ymax; cur_y=cur_y+step){
                        pixels.push([cur_x, cur_y])
                    }
                }
                pixels.map((val, idx)=>{
                    var cur_x = val[0]
                    var cur_y = val[1]
                    if(this.pointInTriangle([cur_x, cur_y], [x1, y1], [x2, y2], [x3, y3])){
                            var matmul_result = this.math.multiply(this.math.inv([[x1,x2,x3], [y1,y2,y3], [1,1,1]]), [cur_x, cur_y, 1])
                            var f_color = this.interpolateColors([prompt1.color, prompt2.color, prompt3.color], matmul_result)
                            
                            ctx.fillStyle = f_color
                            ctx.fillRect(cur_x, cur_y, step, step)
                        }
                })

            }

        })
    }

    renderMix3_canvas(){
        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null || this.props.mother_state.prompt_groups==undefined){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height
        return this.props.mother_state.prompt_groups.map((val, idx)=>{
            if(val.length==3){
                return (<canvas style={{position:'absolute', left:0, zIndex:-1}} width={palette_width} height={palette_height} key={'mix3_'+idx} id={'mix3_'+idx}>
                </canvas>)
            }
        })
    }

    renderMix3(){
        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null || this.props.mother_state.prompt_groups==undefined){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height
        return this.props.mother_state.prompt_groups.map((val, idx)=>{
            if(val.length==3){
                var prompt1 = this.props.mother_state.prompts[val[0]]
                var prompt2 = this.props.mother_state.prompts[val[1]]
                var prompt3 = this.props.mother_state.prompts[val[2]]

                var x1 = palette_width * prompt1.position[0]
                var y1 = palette_height * prompt1.position[1]
                var x2 = palette_width * prompt2.position[0]
                var y2 = palette_height * prompt2.position[1]
                var x3 = palette_width * prompt3.position[0]
                var y3 = palette_height * prompt3.position[1]

                var points = x1+','+y1+' '+x2+','+y2+' '+x3+','+y3
                
                return (<g>
                    <polygon points={points} stroke='white' strokeWidth='2px' fill='transparent'
                    onPointerDown={this.mix3Down.bind(this, val, idx)} onPointerEnter={this.mix3Enter.bind(this, val, idx)} onPointerMove={this.mix3Move.bind(this, val, idx)}></polygon>
                </g>)
            }
        })
    }

    mix3Down(val, idx, e){
        this.setTriplePrompt(val, idx, e)
    }

    mix3Enter(val, idx, e){
        if(this.state.control_action=='control'){
            this.setTriplePrompt(val, idx, e)
        }
    }

    mix3Move(val, idx, e){
        if(this.state.control_action=='control'){
            this.setTriplePrompt(val, idx, e)
        }
    }

    renderMix3_2(){
        var palette_el = document.getElementById('prompt_palette_board')
        if(palette_el==null){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height
        return this.props.mother_state.prompt_groups.map((val, idx)=>{
            if(val.length==3){
                var step = parseInt(palette_width/this.state.step)
                var rendered = []
                var prompt1 = this.props.mother_state.prompts[val[0]]
                var prompt2 = this.props.mother_state.prompts[val[1]]
                var prompt3 = this.props.mother_state.prompts[val[2]]
                var x1 = palette_width * prompt1.position[0]
                var y1 = palette_height * prompt1.position[1]
                var x2 = palette_width * prompt2.position[0]
                var y2 = palette_height * prompt2.position[1]
                var x3 = palette_width * prompt3.position[0]
                var y3 = palette_height * prompt3.position[1]

                var xmin = Math.min(x1,x2,x3)
                var xmax = Math.max(x1,x2,x3)

                var ymin = Math.min(y1,y2,y3)
                var ymax = Math.max(y1,y2,y3)

                for(var cur_x=xmin; cur_x<=xmax; cur_x=cur_x+step){
                    for(var cur_y=ymin; cur_y<=ymax; cur_y=cur_y+step){
                        rendered.push([cur_x, cur_y])
                        // console.log(this.pointInTriangle([cur_x, cur_y], [x1, y1], [x2, y2], [x3, y3]))
                        
                    }
                }

                return rendered.map((val2, idx2)=>{
                    var cur_x = val2[0]
                    var cur_y = val2[1]
                    if(this.pointInTriangle([cur_x, cur_y], [x1, y1], [x2, y2], [x3, y3])){
                        var matmul_result = this.math.multiply(this.math.inv([[x1,x2,x3], [y1,y2,y3], [1,1,1]]), [cur_x, cur_y, 1])
                        var f_color = this.interpolateColors([prompt1.color, prompt2.color, prompt3.color], matmul_result)
                        return <rect x={cur_x-step/2} y={cur_y-step/2} width={step-2} height={step-2} fill={f_color}></rect>
                    }
                })

            }
        })
    }


    promptEnter(idx, e){
        if(this.state.control_action=='control'){
            this.setSinglePrompt(idx, e)
        }
        this.combine2(idx)
    }


    renderPrompts(){
        var palette_el = document.getElementById('prompt_palette_board')

        if(palette_el==null){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        return this.props.mother_state.prompts.map((val, idx)=>{
            var width = val.position[0]*palette_width
            var height = val.position[1]*palette_height

            return (<circle
                onPointerEnter={this.promptEnter.bind(this, idx)} onPointerMove={this.promptEnter.bind(this, idx)} cx={width} cy={height} r={20} stroke="white" strokeWidth={2} fill={val.color} 
            onPointerDown={this.initMovePrompt.bind(this, idx)} style={{pointerEvents: (this.state.current_prompt==idx)?'none':''}}
            ></circle>)
        })
    }

    combineCheck(cur_prompt_group){
        var pass = false
        var AI_stroke_tables = this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id]
        for(var idx in AI_stroke_tables){
            var AI_stroke_list = AI_stroke_tables[idx]
            for(var idx2 in AI_stroke_list){
                var intermediate_id = AI_stroke_list[idx2]
                var cur_obj = this.props.mother_state.AI_intermediate_objs[intermediate_id]
                if(cur_obj.selected_prompt.prompts.length==cur_prompt_group.length){
                    pass = true
                    for(var idx3 in cur_obj.selected_prompt.prompts){
                        if(cur_prompt_group.indexOf(cur_obj.selected_prompt.prompts[idx3])==-1){
                            pass = false
                            break
                        }
                    }
                    if(pass){
                        return true
                    }
                }
            }

        }
        return false
    }

    combine2(idx){
        console.log(idx)
        if(this.state.current_prompt!=-1 && this.state.action=='move_prompt'){
            if(this.state.current_prompt!=idx){
                var already_included = false
                for(var i in this.props.mother_state.prompt_groups){
                    var cur_prompt_group = this.props.mother_state.prompt_groups[i]
                    if(cur_prompt_group.indexOf(idx)!=-1 && cur_prompt_group.indexOf(this.state.current_prompt)!=-1){
                        if(cur_prompt_group.length==2){
                            if(this.combineCheck(cur_prompt_group)==false){
                                this.props.mother_state.prompt_groups.splice(i, 1)
                                this.props.mother_this.setState({}, ()=>{
                                    this.props.mother_this.storeCurrentState('Update prompt palette detach2')
                                })
                                
                            }
                            
                        }else if(cur_prompt_group.length==3){
                            // if some prompts paths goes through this.. skip
                            if(this.combineCheck(cur_prompt_group)==false){
                                this.props.mother_state.prompt_groups[i].splice(cur_prompt_group.indexOf(this.state.current_prompt),1)
                                this.props.mother_this.setState({}, ()=>{
                                    this.props.mother_this.storeCurrentState('Update prompt palette detach3')
                                })
                            }

                            // this.props.mother_state.prompt_groups[i].splice(cur_prompt_group.indexOf(this.state.current_prompt),1)
                        }
                        already_included = true
                        break
                    }
                }
                if(already_included==false){
                    this.props.mother_state.prompt_groups.push([idx, this.state.current_prompt])
                    this.props.mother_this.setState({}, ()=>{
                        this.props.mother_this.storeCurrentState('Update prompt palette combine2')
                    })
                }
            }
        }
        
    }

    drawCurve(p) {

        var pc = this.controlPoints(p); // the control points array
      
        let d="";
        d += `M${p[0][0]}, ${p[0][1]}`
        
        // the first & the last curve are quadratic Bezier
        // because I'm using push(), pc[i][1] comes before pc[i][0]
        d += `Q${pc[1][1].x}, ${pc[1][1].y}, ${p[1][0]}, ${p[1][1]}`;
      
      
        if (p.length > 2) {
          // central curves are cubic Bezier
          for (var i = 1; i < p.length - 2; i++) {
            
           d+= `C${pc[i][0].x}, ${pc[i][0].y} ${pc[i + 1][1].x},${pc[i + 1][1].y} ${p[i + 1][0]},${p[i + 1][1]}`; 
      
          }//end for
          // the first & the last curve are quadratic Bezier
          let n = p.length - 1;
          d+=`Q${pc[n - 1][0].x}, ${pc[n - 1][0].y} ${p[n][0]},${p[n][1]}`;
        }
        return d;
    }

    controlPoints(p, t=1/5) {
        // given the points array p calculate the control points
        let pc = [];
        for (var i = 1; i < p.length - 1; i++) {
            let dx = p[i - 1][0] - p[i + 1][0]; // difference x
            let dy = p[i - 1][1] - p[i + 1][1]; // difference y
            // the first control point
            let x1 = p[i][0] - dx * t;
            let y1 = p[i][1] - dy * t;
            let o1 = {
            x: x1,
            y: y1
            };
        
            // the second control point
            var x2 = p[i][0] + dx * t;
            var y2 = p[i][1] + dy * t;
            var o2 = {
            x: x2,
            y: y2
            };
        
            // building the control points array
            pc[i] = [];
            pc[i].push(o1);
            pc[i].push(o2);
        }
        return pc;
    }

    promptPositionComparison(obj1, obj2){
        var obj1_prompts = obj1.selected_prompt.prompts
        var obj2_prompts = obj2.selected_prompt.prompts

        var obj1_weights = obj1.selected_prompt.weights
        var obj2_weights = obj2.selected_prompt.weights

        if(obj1_prompts.length != obj2_prompts.length){
            return false
        }
        for(var i1 in obj1_prompts){
            var i2 = obj2_prompts.indexOf(obj1_prompts[i1])
            if(i2==-1){
                return false
            }
            if(obj1_weights[i1]!=obj2_weights[i2]){
                return false
            }
        }
        return true
    }

    renderPastPaths(){
        var palette_el = document.getElementById('prompt_palette_board')

        if(palette_el==null){
            return
        }

        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        if(this.props.mother_state.stroke_id!=undefined){
            if(this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id]!=undefined){
                var AI_stroke_tables = this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id]
                return AI_stroke_tables.map((AI_stroke_list, idx)=>{
                    var points = []

                    for(var i in AI_stroke_list){
                        var intermediate_id = AI_stroke_list[i]
                        var cur_obj = this.props.mother_state.AI_intermediate_objs[intermediate_id]
                        if(cur_obj==undefined){
                            continue
                        }
                        if(cur_obj.selected_prompt==undefined){
                            continue
                        }

                        var width = 0
                        var height = 0

                        for(var p_idx in cur_obj.selected_prompt.prompts){
                            if(this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]]==undefined){
                                return
                            }
                            width = width + this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]].position[0]*cur_obj.selected_prompt.weights[p_idx]
                            height = height + this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]].position[1]*cur_obj.selected_prompt.weights[p_idx]
                        }


                        width = width*palette_width
                        height = height*palette_height

                        if(cur_obj.selected_prompt.prompts.length==2){
                            var x0 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[0]].position[0]
                            var y0 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[0]].position[1]
                            var x1 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[1]].position[0]
                            var y1 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[1]].position[1]
                            var xd = x1-x0
                            var yd = y1-y0
                            var d = Math.sqrt(cur_obj.selected_prompt.side[0]*cur_obj.selected_prompt.side[0]+cur_obj.selected_prompt.side[1]*cur_obj.selected_prompt.side[1])

                            width = width + d* Math.sign(cur_obj.selected_prompt.side[0]) *Math.abs(yd)/Math.sqrt(xd*xd+yd*yd)
                            height = height + d * Math.sign(cur_obj.selected_prompt.side[1]) * Math.abs(xd)/Math.sqrt(xd*xd+yd*yd)
                        }

                            var prev_intermediate_id = AI_stroke_list[i-1]
                            var prev_obj = this.props.mother_state.AI_intermediate_objs[prev_intermediate_id]
                            var next_intermediate_id = AI_stroke_list[i+1]
                            var next_obj = this.props.mother_state.AI_intermediate_objs[next_intermediate_id]

                            var pass = true
                            if(prev_obj!=undefined){ 
                                if(this.promptPositionComparison(prev_obj, cur_obj)){
                                    pass= false
                                }
                            }

                            if(next_obj!=undefined){ 
                                if(this.promptPositionComparison(next_obj, cur_obj)){
                                    pass= false
                                }
                            }
                            var samepos = 0
                            var counter = 0
                            for(var ti=0; ti<idx; ti++){
                                if(ti==idx){
                                    continue
                                }
                                
                                for(var li in AI_stroke_tables[ti]){
                                    var comp_obj = this.props.mother_state.AI_intermediate_objs[AI_stroke_tables[ti][li]]
                                    if(this.promptPositionComparison(comp_obj, cur_obj)){
                                        counter = counter + 1
                                        if(counter>=2){
                                            samepos = samepos+1
                                            break
                                        }
                                        
                                    }
                                    
                                }
                            }
                            var r = 0
                            
                            if(samepos>0){
                                pass=false
                            }
                            if(pass==false){
                                r = 6+samepos*6
                            }
                            var rad_ratio = cur_obj.gen_tick/this.props.mother_state.gen_steps
                            width = width + r*Math.cos(2*Math.PI*rad_ratio) + r*Math.sin(2*Math.PI*rad_ratio)
                            height = height -r*Math.sin(2*Math.PI*rad_ratio) + r*Math.cos(2*Math.PI*rad_ratio)
                            points.push([width, height])
                        }
                        
                        
                    
                    if(points.length<3){
                        return
                    }

                    var curve = this.drawCurve(points)

                    var s_color = 'white'

                    if(idx==this.props.mother_state.AI_stroke_id){
                        s_color = '#32cf7d'
                    }

                    return (<g>
                        <path stroke={'white'} fill='transparent' d={curve} strokeWidth={2} style={{pointerEvents: (this.state.control_action=='control')?'none':''}}></path>
                        <path stroke={s_color} fill='transparent' d={curve} strokeWidth={1} style={{pointerEvents: (this.state.control_action=='control')?'none':''}}></path>
                    </g>
                    )
                    
                })
            }
        }

    }

    renderPastPoints(){
        var palette_el = document.getElementById('prompt_palette_board')

        if(palette_el==null){
            return
        }

        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        if(this.props.mother_state.stroke_id!=undefined){
            if(this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id]!=undefined){
                var AI_stroke_tables = this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id]
                return AI_stroke_tables.map((AI_stroke_list, idx)=>{
                    return AI_stroke_list.map((intermediate_id, idx2)=>{
                        var cur_obj = this.props.mother_state.AI_intermediate_objs[intermediate_id]
                        
                        if(cur_obj==undefined){
                            return
                        }
                        if(cur_obj.selected_prompt==undefined){
                            console.log(cur_obj)
                            return
                        }
                        var width = 0
                        var height = 0

                        for(var p_idx in cur_obj.selected_prompt.prompts){
                            if(this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]]==undefined){
                                return
                            }
                            width = width + this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]].position[0]*cur_obj.selected_prompt.weights[p_idx]
                            height = height + this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[p_idx]].position[1]*cur_obj.selected_prompt.weights[p_idx]
                        }
                        // if()


                        width = width*palette_width
                        height = height*palette_height

                        if(cur_obj.selected_prompt.prompts.length==2){
                            var x0 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[0]].position[0]
                            var y0 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[0]].position[1]
                            var x1 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[1]].position[0]
                            var y1 = this.props.mother_state.prompts[cur_obj.selected_prompt.prompts[1]].position[1]
                            var xd = x1-x0
                            var yd = y1-y0
                            var d = Math.sqrt(cur_obj.selected_prompt.side[0]*cur_obj.selected_prompt.side[0]+cur_obj.selected_prompt.side[1]*cur_obj.selected_prompt.side[1])
                            // width = width + d* Math.sign(-xd)* Math.sign(cur_obj.selected_prompt.side[0])* -yd/Math.sqrt(xd*xd+yd*yd)
                            // height = height + d * Math.sign(-yd)* Math.sign(cur_obj.selected_prompt.side[0])* xd/Math.sqrt(xd*xd+yd*yd)
                            width = width + d*  Math.sign(cur_obj.selected_prompt.side[0])* Math.abs(yd)/Math.sqrt(xd*xd+yd*yd)
                            height = height + d * Math.sign(cur_obj.selected_prompt.side[1])* Math.abs(xd)/Math.sqrt(xd*xd+yd*yd)
                        }

                        var prev_intermediate_id = AI_stroke_list[idx2-1]
                        var prev_obj = this.props.mother_state.AI_intermediate_objs[prev_intermediate_id]
                        var next_intermediate_id = AI_stroke_list[idx2+1]
                        var next_obj = this.props.mother_state.AI_intermediate_objs[next_intermediate_id]

                        

                        var pass = true
                        if(prev_obj!=undefined){ 
                            if(this.promptPositionComparison(prev_obj, cur_obj)){
                                pass= false
                            }
                        }

                        if(next_obj!=undefined){ 
                            if(this.promptPositionComparison(next_obj, cur_obj)){
                                pass= false
                            }
                        }

                        // change the position to consider rotation
                        var samepos = 0
                        var counter = 0
                        for(var ti=0; ti<idx; ti++){
                            if(ti==idx){
                                continue
                            }
                            
                            for(var li in AI_stroke_tables[ti]){
                                var comp_obj = this.props.mother_state.AI_intermediate_objs[AI_stroke_tables[ti][li]]
                                if(this.promptPositionComparison(comp_obj, cur_obj)){
                                    counter = counter + 1
                                    if(counter>=2){
                                        samepos = samepos+1
                                        break
                                    }
                                    
                                }
                                
                            }
                        }
                        var r = 0
                        
                        if(samepos>0){
                            pass=false
                        }
                        if(pass==false){
                            r = 6+samepos*6
                        }
                        var rad_ratio = cur_obj.gen_tick/this.props.mother_state.gen_steps
                        width = width + r*Math.cos(2*Math.PI*rad_ratio) + r*Math.sin(2*Math.PI*rad_ratio)
                        height = height -r*Math.sin(2*Math.PI*rad_ratio) + r*Math.cos(2*Math.PI*rad_ratio)

                            

                            
                            
                        

                        var colors = []
                        var weights = []
                        var directional_prompts = cur_obj.directional_prompts
                        for(var i in directional_prompts){
                            var dir_prompt = directional_prompts[i]
                            if(dir_prompt.value<0){
                                colors.push(this.interpolateColors([dir_prompt.colorA, '#333333'], [(-parseFloat(dir_prompt.value))/100, (parseFloat(dir_prompt.value)+100)/100]))
                            }else{
                                colors.push(this.interpolateColors([dir_prompt.colorB, '#333333'], [(parseFloat(dir_prompt.value))/100, (100-parseFloat(dir_prompt.value))/100]))
                            }
                            weights.push(1/directional_prompts.length)
                        }
                        var f_color 
                        if(colors.length>0){
                            f_color= this.interpolateColors(colors, weights)
                        }else{
                            f_color = '#333333'
                        }  

                        var s_color = 'white'

                        if(this.props.mother_state.gen_tick+1==cur_obj.gen_tick && idx==this.props.mother_state.AI_stroke_id){
                            s_color = '#32cf7d'
                        }

                        return (<g key={'pointpath_'+idx+'_'+idx2} style={{pointerEvents: (this.state.control_action=='control')?'none':''}}> 
                            <circle style={{pointerEvents: (this.state.control_action=='control')?'none':''}} cx={width} cy={height} stroke={s_color} strokeWidth={2} fill={f_color} r='5' onPointerDown={this.selectPastPoint.bind(this, idx, idx2)}></circle>
                        </g>)
                    })
                })
            }
        }
    }

    selectPastPoint(AI_stroke_id, path_idx, e){
        if(this.props.mother_state.gen_start){
            return
        }
        e.stopPropagation()
        var obj_id = this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id][AI_stroke_id][path_idx]
        var obj = this.props.mother_state.AI_intermediate_objs[obj_id]
        console.log(obj)

        this.props.mother_state.AI_stroke_id = AI_stroke_id
        
        
        this.props.mother_state.current_layer = obj.current_layer
        this.props.mother_state.layers[obj.current_layer] = JSON.parse(JSON.stringify(obj.layer))
        var el = document.getElementById('sketchpad_canvas_'+obj.layer.layer_id)
        var ctx = el.getContext('2d');
        
        var img = new Image();
        img.src = obj.layer.image
        var _this = this
        img.onload = function(){
            ctx.clearRect(0,0,_this.props.mother_state.pixelwidth,_this.props.mother_state.pixelheight);
            ctx.drawImage(this, 0,0)
        }

        this.props.mother_state.gen_tick = obj.gen_tick-1
        this.props.mother_state.guidance_scale = obj.guidance_scale
        this.props.mother_state.gen_steps = obj.gen_steps
        // this.state.selected_prompt = JSON.parse(JSON.stringify(obj.selected_prompt))
        // this.props.mother_state.directional_prompts = JSON.parse(JSON.stringify(obj.directional_prompts))
        // this.props.mother_state.prompts = obj.prompts
        if(this.props.mother_state.undo_prompts){
            for(var i in this.props.mother_state.prompts){
                for(var j in obj.prompts){
                    if(this.props.mother_state.prompts[i]._id == obj.prompts[j]._id){
                        this.props.mother_state.prompts[i].prompt = obj.prompts[j].prompt
                        continue
                    }
                }
            }
        }
        
        // this.props.mother_state.prompt_groups = JSON.parse(JSON.stringify(obj.prompt_groups))
        this.props.mother_state.latents = obj.latents
        this.props.mother_state.cutxmin = obj.cutxmin
        this.props.mother_state.cutymin = obj.cutymin
        this.props.mother_state.cutxmax = obj.cutxmax
        this.props.mother_state.cutymax = obj.cutymax
        this.props.mother_this.setState({})
    }

    

    renderSelector(){
        var palette_el = document.getElementById('prompt_palette_board')
        var val = this.props.mother_state.selected_prompt
        if (val==undefined){
            return
        }
        if(palette_el==null){
            return
        }
        var palette_width = palette_el.getBoundingClientRect().width
        var palette_height = palette_el.getBoundingClientRect().height

        var width = val.position[0]*palette_width
        var height = val.position[1]*palette_height

        return (<g>
            <circle style={{pointerEvents:'none'}} cx={width} cy={height} stroke='#32cf7d' fill='transparent' r='10'></circle>
            <circle style={{pointerEvents:'none'}} cx={width} cy={height} stroke='white' fill='transparent' r='12'></circle>
        </g>)
    }

    renderBackground(){
        var colors = []
        var weights = []
        for(var i in this.props.mother_state.directional_prompts){
            var dir_prompt = this.props.mother_state.directional_prompts[i]
            if(dir_prompt.value<0){
                colors.push(this.interpolateColors([dir_prompt.colorA, '#333333'], [(-parseFloat(dir_prompt.value))/100, (parseFloat(dir_prompt.value)+100)/100]))
            }else{
                colors.push(this.interpolateColors([dir_prompt.colorB, '#333333'], [(parseFloat(dir_prompt.value))/100, (100-parseFloat(dir_prompt.value))/100]))
            }
            
            weights.push(1/this.props.mother_state.directional_prompts.length)
        }
        var f_color 
        if(colors.length>0){
            f_color= this.interpolateColors(colors, weights)
        }else{
            f_color = 'transparent'
        }
        // console.log(colors)
        return (<svg style={{width:'100%', height:'100%', position:'absolute', zIndex: -1}}>
            <rect width='100%' height='100%' fill={f_color}></rect>
        </svg>)

    }

    render(){
        return (<div className={'prompt_palette'}>
        <div style={{display:'flex', marginBottom: 5, justifyContent:'space-between'}}>
            <div>Prompt Palette</div>
            <div>
            <div class="switch" style={{'opacity': (this.props.mother_state.gen_tick>=0)?0.5:1}}>
                <label>
                Edit
                <input onChange={this.toggleFix.bind(this)} checked={this.state.palette_fix} type="checkbox" disabled={this.state.gen_tick>=0}/>
                <span class="lever"></span>
                Fix
                </label>
            </div>
            </div>
        </div>
        <div style={{flexGrow:1, position:'relative'}}>
        {this.renderBackground()}
        {this.renderMix3_canvas()}
            <svg id={'prompt_palette_board'} style={{height:'100%', width:'100%', border: 'solid 2px white'}} onPointerDown={this.downPointer.bind(this)} onPointerMove={this.movePointer.bind(this)} onPointerUp={this.endPointer.bind(this)}>
                
                {this.renderMix2()}
                {this.renderMix3()}
                {this.renderPrompts()}
                {this.renderPastPaths()}
                {this.renderPastPoints()}
                {this.renderSelector()}

            </svg>
            

        </div>
    </div>)
    }
}
export default PromptControllerPalette