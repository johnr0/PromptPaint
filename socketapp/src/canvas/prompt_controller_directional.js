import React from 'react'

class PromptControllerDirectional extends React.Component{
    state = {
        prompt_update_tick: false
    }

    promptChange(type, idx, e){
        var cur_input = e.target.value
        var el
        el = document.getElementById('prompt_directional_'+type+'_'+this.props.mother_state.directional_prompts[idx]._id)
        this.props.mother_state.directional_prompts[idx]['prompt'+type] = cur_input

        this.props.mother_this.setState({}, ()=>{
            this.props.mother_this.storeCurrentState('Update directional prompt text')
        })
        el.style.height = 0
        el.style.height = (el.scrollHeight+1)+'px'
    }

    promptColorChange(type, val, idx, e){
        this.props.mother_state.directional_prompts[idx]['color'+type] =e.target.value
        this.props.mother_this.setState({}) 
    }

    sliderChange(val, idx, e){
        this.props.mother_state.directional_prompts[idx].value =e.target.value
        this.props.mother_this.setState({}) 

        if(this.state.prompt_update_tick == false){
            var directional_prompts=[]
            for(var i in this.props.mother_state.directional_prompts){
                var prompt_set = this.props.mother_state.directional_prompts[i]
                var nps = {
                    promptA: prompt_set.promptA,
                    promptB: prompt_set.promptB,
                    value: prompt_set.value
                }
                directional_prompts.push(nps)
            }

            var send_data = {
                'stroke_id': this.props.mother_state.stroke_id, 
                'directional_prompts': directional_prompts, 
                'directional_prompts_proto': JSON.parse(JSON.stringify(this.props.mother_state.directional_prompts)),
            }

            this.props.mother_this.AIDrawCanvas.current.socket.emit("directional_prompts_update", send_data)
            var _this = this
            this.setState({prompt_update_tick: true}, function(){
                _this.props.mother_this.storeCurrentState('Update directional prompt slider')
                setTimeout(function(){
                    _this.setState({prompt_update_tick: false})
                }, 200)
            })
        }
    }

    changePromptType(type, idx){
        this.props.mother_state.directional_prompts[idx]['is'+type+'text'] = !this.props.mother_state.directional_prompts[idx]['is'+type+'text']
        this.props.mother_this.setState({})
    }

    renderTextPromptInput(type, val, idx){
        return <textarea id={'prompt_directional_'+type+'_'+val._id} className={'prompt_textarea'} value={val['prompt'+type]} onChange={this.promptChange.bind(this, type, idx)}></textarea>
    }

    renderImagePromptInput(type, val, idx){
        
    }

    deletePrompt(idx){
        this.props.mother_state.directional_prompts.splice(idx, 1)
        this.props.mother_this.setState({}, ()=>{
            this.props.mother_this.storeCurrentState('Delete directional prompt')
        })
    }

    addNewPrompt(){
        var dir_prompt = {
            _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            promptA: '',
            colorA: "#"+Math.floor(Math.random()*16777215).toString(16),
            promptB: '',
            colorB: "#"+Math.floor(Math.random()*16777215).toString(16),
            isAtext: true,
            isBtext: true,
            value: 0,
        }
        this.props.mother_state.directional_prompts.push(dir_prompt)
        this.props.mother_this.setState({}, ()=>{
            this.props.mother_this.storeCurrentState('Add directional prompt')
        })
    }

    renderDirectional(){
        return this.props.mother_state.directional_prompts.map((val, idx)=>{
            return (<div style={{display:'flex', justifyContent:'space-between', marginTop: '5px'}}>
                <div className={'prompt_color2'} style={{display:'flex'}}>
                    <input type='color' value={val.colorA} style={{width: 24, height:20, marginRight:3}}
                    onChange={this.promptColorChange.bind(this, 'A', val, idx)}></input>
                    {val.isAtext && this.renderTextPromptInput('A', val, idx)}
                    {!val.isAtext && this.renderTextPromptInput('A', val, idx)}
                    {/* <div className={'btn'} style={{height: 18, width: 28, padding: 0, lineHeight:'18px', marginLeft: 3}} onPointerDown={this.changePromptType.bind(this, 'A', idx)}>
                        {val.isAtext && <i class="fa fa-comment" style={{fontSize:16}} ></i>}
                        {!val.isAtext && <i class="fa fa-image" style={{fontSize:16}} ></i>}
                    </div> */}
                </div>
                <div style={{marginRight:5, marginLeft:5}}>
                    <input type='range' min='-100' max='100' value={val.value} 
                    style={{margin:0, border: 'solid 0px transparent', verticalAlign:'super'}}
                    onChange={this.sliderChange.bind(this, val, idx)}></input>
                </div>
                <div className={'prompt_color2'} style={{display:'flex'}}>
                    <input type='color' value={val.colorB} style={{width: 24, height:20, marginRight:3}}
                    onChange={this.promptColorChange.bind(this, 'B', val, idx)}></input>
                    {val.isAtext && this.renderTextPromptInput('B', val, idx)}
                    {!val.isAtext && this.renderTextPromptInput('B', val, idx)}
                    {/* <div className={'btn'} style={{height: 18, width: 28, padding: 0, lineHeight:'18px', marginLeft: 3}} onPointerDown={this.changePromptType.bind(this, 'B', idx)}>
                        {val.isBtext && <i class="fa fa-comment" style={{fontSize:16}} ></i>}
                        {!val.isBtext && <i class="fa fa-image" style={{fontSize:16}} ></i>}
                    </div> */}
                </div>
                <div className={'btn red'} style={{height: 18, width: 30, padding: 0, lineHeight:'18px', marginLeft: 3}} onPointerDown={this.deletePrompt.bind(this, idx)} disabled={this.props.mother_state.stroke_id!=undefined}>
                    X
                </div>
            </div>)
        })
    }
    
    render(){
        return (<div className={'directional_prompts'}>
        <div style={{display:'flex', marginTop: 5}}>
            <div style={{marginRight: 10}}>Directional Prompts</div>
            <div className={'btn'} style={{height: 20, width: 30, padding: 0, lineHeight:'20px'}} onPointerDown={this.addNewPrompt.bind(this)}>+</div>
        </div>
        <div style={{flexGrow:1, overflowY:'auto'}}>
            {this.renderDirectional()}
        </div>
    </div>)
    }
}
export default PromptControllerDirectional