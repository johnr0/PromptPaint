import React from 'react'

class PromptBrushConfig extends React.Component{
    state={
        guidance_scale_update_tick: false
    }


    changeValue(type, e){
        this.props.mother_state[type]=parseFloat(e.target.value)
        if(type=='guidance_scale' && this.props.mother_state.gen_start){
            if(this.state.guidance_scale_update_tick==false){
                console.log('gd scale update')
                this.props.mother_this.AIDrawCanvas.current.socket.emit('guidance_scale_update', {stroke_id: this.props.mother_state.stroke_id, guidance_scale: parseFloat(e.target.value)})
                var _this = this
                this.setState({guidance_scale_update_tick:true}, function(){
                    
                    setTimeout(function(){
                        _this.setState({guidance_scale_update_tick:false})
                    }, 200)
                })
            }
        }
        this.props.mother_this.setState({}, ()=>{
            this.props.mother_this.storeCurrentState('Update '+type)
        })
    }

    sizeOn(e){
        e.stopPropagation();
        this.props.mother_this.setState({action:'size'})
    }

    nonIdle(e){
        e.stopPropagation();
    }

    change_brush_size(e){
        this.props.mother_this.setState({AI_brush_size: e.target.value})
    }

    multiStrokeOn(){
        this.props.mother_this.setState({multi_strokes:true})
    }

    multiStrokeOff(){
        var _this = this
        this.props.mother_this.setState({multi_strokes:false}, function(){
            _this.props.mother_this.AIDrawCanvas.current.initGen2();
        })
    }

    copytest(mode){
        this.props.mother_this.setState({AI_brush_mode:mode})
    }

    paintAll(){
        if(this.props.mother_state.selected_prompt==undefined){
            alert("You have to select prompt before running generation.")
            return
        }
        var el = document.getElementById('AI_area_canvas')
        var ctx = el.getContext('2d');
        this.props.mother_state.stroke_id= Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        ctx.fillRect(0,0,this.props.mother_state.pixelwidth, this.props.mother_state.pixelheight)
        this.props.mother_this.AIDrawCanvas.current.initGen2(0)
    }

    render(){
        var pixelwidth = this.props.mother_state.pixelwidth
        var pixelheight = this.props.mother_state.pixelheight
        return (<div className={'brush_config'}>
            
            
            <div style={{display: 'flex', height:'100%'}}>
                
                {/* TODO realize the multi stroke function */}
                <div style={{display:'flex', flexDirection:'column'}}>
                    <div style={{marginBottom: 5}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <div>Brush Config</div>
                            <div className={'btn'} style={{height:22, lineHeight:'22px'}} onPointerDown={this.sizeOn.bind(this)}>Size</div>
                        </div>
                    </div>
                    <div style={{display:'table', height:'calc(100% - 22px)', width:180}}>
                        
                        <div className='btn' style={{height:'100%', width:'50%', display:'table-cell', lineHeight:'1rem'}} onPointerDown={this.multiStrokeOn.bind(this)} onPointerUp={this.multiStrokeOff.bind(this)}>
                        <div>Multi Strokes</div> 
                        </div>
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <div className='btn' style={{height:'100%', width:'100%', display:'table-cell', lineHeight:'1rem', opacity:(this.props.mother_state.AI_brush_mode=='draw')?1:0.5, backgroundColor:(this.props.mother_state.stroke_id==undefined)?'':'#333333'}} onPointerDown={this.copytest.bind(this, 'draw')}>
                                <div>Draw</div> 
                            </div>
                            {/* <div className='btn' style={{height:'100%', width:'100%', display:'table-cell', lineHeight:'1rem', opacity:(this.props.mother_state.AI_brush_mode=='erase')?1:0.5, backgroundColor:(this.props.mother_state.stroke_id!=undefined)?'':'#333333'}} onPointerDown={this.copytest.bind(this, 'erase')}>
                                <div>Erase</div> 
                            </div>
                            <div className='btn' style={{height:'100%', width:'100%', display:'table-cell', lineHeight:'1rem', opacity:(this.props.mother_state.AI_brush_mode=='revise')?1:0.5, backgroundColor:(this.props.mother_state.stroke_id!=undefined)?'':'#333333'}} onPointerDown={this.copytest.bind(this, 'revise')}>
                                <div>Revise</div> 
                            </div> */}
                            <div className='orange btn' style={{height:'100%', width:'100%', display:'table-cell', lineHeight:'1rem', backgroundColor:(this.props.mother_state.stroke_id==undefined)?'':'#333333'}} onPointerDown={this.paintAll.bind(this)} disabled={this.props.mother_state.stroke_id!=undefined}>
                                <div>All</div> 
                            </div>
                        </div>
                        
                    </div>
                </div>

                <div style={{marginLeft: 5, flexGrow:1, overflowY:'auto', overflowX: 'hidden'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <div>
                                {/* <div>Guide Scale:</div>  */}
                                <div>Single stroke:</div> 
                                <div>Steps:</div> 
                                <div>Overcoat:</div> 
                                {/* <div>Cur Progress:</div>  */}
                            </div>
                            <div style={{flexGrow:1, marginRight:3, marginLeft: 3}}>
                                {/* <div style={{display:'flex'}}>
                                    <input className={'intext_number_input'} type='range' max={50} min={0} value={this.props.mother_state.guidance_scale} onChange={this.changeValue.bind(this, 'guidance_scale')}></input>
                                    
                                </div> */}
                                <div style={{display:'flex'}}>
                                    <input className={'intext_number_input'} type='range' max={100} min={0} value={this.props.mother_state.single_stroke_ratio} onChange={this.changeValue.bind(this, 'single_stroke_ratio')} style={{opacity:(this.props.mother_state.gen_start)?'0.5':'1'}} disabled={this.props.mother_state.gen_start}></input>
                                    
                                </div>
                                <div style={{display:'flex'}}>
                                    <input className={'intext_number_input'} type='range' max={500} min={1} value={this.props.mother_state.gen_steps} onChange={this.changeValue.bind(this, 'gen_steps')} style={{opacity:(this.props.mother_state.stroke_id!=undefined)?'0.5':'1'}} disabled={this.props.mother_state.stroke_id!=undefined}></input>
                                </div>
                                <div style={{display:'flex'}}>
                                    <input className={'intext_number_input'} type='range' max={100} min={0} value={this.props.mother_state.overcoat_ratio} onChange={this.changeValue.bind(this, 'overcoat_ratio')} style={{opacity:(this.props.mother_state.stroke_id!=undefined)?'0.5':'1'}} disabled={this.props.mother_state.stroke_id!=undefined}></input>
                                </div>
                                {/* <div style={{display:'flex'}}>
                                    <input className={'intext_number_input'} type='range' max={this.props.mother_state.gen_steps} min={0} value={this.props.mother_state.gen_tick} onChange={this.changeValue.bind(this, 'gen_tick')}></input>
                                </div> */}
                            </div>
                            <div style={{width:35}}>
                                {/* <div>{this.props.mother_state.guidance_scale}</div> */}
                                <div>{this.props.mother_state.single_stroke_ratio}%</div>
                                <div>{this.props.mother_state.gen_steps}</div>
                                <div>{this.props.mother_state.overcoat_ratio}%</div>
                            </div>
                        </div>
                        
                    
                </div>
            </div>

            {this.props.mother_state.brush_img && 
            <div className='controller AI_brush_size_controller' onPointerDown={this.nonIdle.bind(this)}
                style={{border: 'solid 3px #333333', backgroundColor: '#eeeeee',
                display: (this.props.mother_state.control_state=='AI' && this.props.mother_state.action=='size')?'inline-block':'none' }}>
                <div style={{width:'10%', height: '100%', display: 'inline-block', verticalAlign:'bottom'}}>
                    <input value={this.props.mother_state.AI_brush_size} type='range' min='1' max='200' orient='vertical' onChange={this.change_brush_size.bind(this)}></input>
                </div>
                <div style={{width:'90%', height: '100%', display: 'inline-block', overflow:'hidden', position:'relative'}}>
                    <div id='AI_brush_size_canvas' width={this.props.mother_state.brush_img.width} height={this.props.mother_state.brush_img.height} 
                    style={{width: this.props.mother_state.AI_brush_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom, 
                    height: this.props.mother_state.AI_brush_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom,
                    position:'absolute', left: 165.6/2-this.props.mother_state.AI_brush_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom/2,
                    top: 184/2-this.props.mother_state.AI_brush_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom/2,
                    borderRadius: '50%', border: 'solid 1px #333333'
                    }}
                    ></div>
                </div>
            </div>}
            


        </div>)
    }
}
export default PromptBrushConfig