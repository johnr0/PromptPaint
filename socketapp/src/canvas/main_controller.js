import React, {Component} from 'react'
import BrushController from './brush_controller'
import EraserController from './eraser_controller'

class MainController extends Component{
    changeControlState(control_state){
        if(this.props.mother_state.stroke_id!=undefined){
            return
        }
        if(this.props.mother_state.current_layer!=-1){
            var layer = this.props.mother_state.layers[this.props.mother_state.current_layer]
            // var layer = this.props.mother_state.layer_dict[layer_id]
            if(layer!=undefined){
                if(layer.hide!=true){
                    console.log(control_state)
                    if(control_state=='move-layer'){
                        this.props.mother_this.initializeMoveLayer();
                    }
                    if(control_state=='content-stamp'){

                        this.props.mother_this.props.board_this.moodboard.setState({control_state:'content-stamp'})
                        var moodboard_state = this.props.mother_this.props.board_this.moodboard.state
                        if(moodboard_state.current_image.length>1 || moodboard_state.current_text.length>0){
                            this.props.mother_this.props.board_this.moodboard.deSelect();
                        }
                    }
                    if(control_state!='content-stamp'&&control_state!='style-stamp'&&(this.props.mother_state.control_state=='content-stamp'||this.props.mother_state.control_state=='style-stamp')){
                        this.props.mother_this.props.board_this.moodboard.setState({control_state:'control_object', action: 'idle'})
                    }
                        this.props.mother_this.setState({control_state: control_state})
                }
            }
            
        } 
    }

    render(){
        var basecolor='#888888'
        if(this.props.mother_state.current_layer==-1){
            basecolor='#444444'
        }else{
            var layer_id = this.props.mother_state.layers[this.props.mother_state.current_layer]
            var layer = this.props.mother_state.layer_dict[layer_id]
            if(layer!=undefined){
                if(layer.hide==true){
                    basecolor='#444444'
                }
            }
        }
        
        return (<div className="controller main_controller" style={{opacity:(this.props.mother_state.stroke_id!=undefined)?'0.5':'1'}}>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='move')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'move')}>
                <i className='controller_button_icon fa fa-hand-paper'></i>
            </div>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='move-layer')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'move-layer')}>
                <i className='controller_button_icon fa fa-arrows'></i>
            </div>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='brush')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'brush')}>
                <i className='controller_button_icon fa fa-paint-brush'></i>
            </div>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='erase')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'erase')}>
                <i className='controller_button_icon fa fa-eraser'></i>
            </div>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='area')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'area')}>
                <span className="iconify" data-icon="mdi-lasso" data-inline="false"></span>
                {/* < style={{width: '38px', height: '38px', border: (this.props.mother_state.control_state=='area')?'dashed 4px white':'dashed 4px #888888'}}></div> */}
   
            </div>
            <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='AI')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'AI')}>
                <span className={'select_disabled'}>AI</span>
            </div>

            <div  className='controller_button' style={{color: '#cccccc'}}
                onClick={this.props.mother_this.storeWholeState.bind(this.props.mother_this)}>
                <i className='controller_button_icon fa fa-save'></i>
            </div>
            {/* <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='content-stamp')?'white':basecolor}}
                onClick={this.changeControlState.bind(this, 'content-stamp')}>
                <i style={{fontSize:'25px', verticalAlign:'bottom'}} className='controller_button_icon fa fa-stamp'></i>
                <span style={{fontSize:'20px'}}>C</span>
            </div> */}
            {/* <div  className='controller_button' style={{color: (this.props.mother_state.control_state=='copy_content')?'white':'#888888'}}>
                <i className='controller_button_icon fa fa-stamp'></i>
   
            </div> */}
            {this.props.mother_state.control_state=='brush'&&
                <BrushController mother_this={this.props.mother_this} mother_state={this.props.mother_state}></BrushController>
            }
            {this.props.mother_state.control_state=='erase'&&
                <EraserController mother_this={this.props.mother_this} mother_state={this.props.mother_state}></EraserController>
            }
            
        </div>)
    }
}

export default MainController;