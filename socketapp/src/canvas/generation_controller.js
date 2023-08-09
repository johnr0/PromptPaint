import { e } from 'mathjs'
import React from 'react'

class GenerationController extends React.Component{
    setGenStop(){
        console.log(this.props.mother_state.gen_tick, this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id][this.props.mother_state.AI_stroke_id].length)
        this.props.mother_this.AIDrawCanvas.current.socket.emit('gen_stop', {'stroke_id': this.props.mother_state.stroke_id})
        this.props.mother_this.setState({gen_start:false})
    }
    setGenStart(){
        var _this = this
        this.props.mother_this.setState({gen_start:true}, function(){
            _this.props.mother_this.AIDrawCanvas.current.initGen2(_this.props.mother_state.gen_tick, undefined, true)
        })
    }

    GenChange(e){
        if(this.props.mother_state.gen_start){
            return
        }
        var gt = parseInt(e.target.value)
        if(gt>=this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id][this.props.mother_state.AI_stroke_id].length){
            return 
        }
        var obj_id = this.props.mother_state.AI_stroke_tables[this.props.mother_state.stroke_id][this.props.mother_state.AI_stroke_id][gt]
        var obj = this.props.mother_state.AI_intermediate_objs[obj_id]
        console.log(obj)

        
        
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

        this.props.mother_state.gen_tick = gt
        this.props.mother_state.guidance_scale = obj.guidance_scale
        this.props.mother_state.gen_steps = obj.gen_steps
        // this.state.selected_prompt = JSON.parse(JSON.stringify(obj.selected_prompt))
        // this.props.mother_state.directional_prompts = JSON.parse(JSON.stringify(obj.directional_prompts))
        // this.props.mother_state.prompts = obj.prompts
        // this.props.mother_state.prompt_groups = JSON.parse(JSON.stringify(obj.prompt_groups))
        this.props.mother_state.latents = obj.latents
        this.props.mother_state.cutxmin = obj.cutxmin
        this.props.mother_state.cutymin = obj.cutymin
        this.props.mother_state.cutxmax = obj.cutxmax
        this.props.mother_state.cutymax = obj.cutymax
        this.props.mother_this.setState({})

    }

    render(){
        return (<div className={'controller generation_controller'} style={{backgroundColor:(this.props.mother_state.stroke_id==undefined)?'#aaaaaa':'#333333'}}>
            <div>
                Generation Controller
            </div>
            <div style={{display:'flex'}}>
                <div style={{display:'flex', flexGrow:1, marginRight: 5}}>
                    <input className={'intext_number_input'} type='range' max={this.props.mother_state.gen_steps} min={0} value={this.props.mother_state.gen_tick}
                        onChange={this.GenChange.bind(this)} disabled={this.props.mother_state.stroke_id==undefined}></input>
                </div>
                <div style={{display:'flex'}}>
                    {this.props.mother_state.gen_tick<0 && <div className='btn' style={{width: 100}} disabled>Non</div>}
                    {this.props.mother_state.gen_tick>=0 && this.props.mother_state.gen_start && <div className='btn red' style={{width: 100}} onPointerDown={this.setGenStop.bind(this)}>Stop</div>}
                    {this.props.mother_state.gen_tick>=0 && this.props.mother_state.gen_start==false && <div className='btn' style={{width: 100}} onPointerDown={this.setGenStart.bind(this)}>Start</div>}
                </div>
            </div>
            
        </div>)
    }
}
export default GenerationController