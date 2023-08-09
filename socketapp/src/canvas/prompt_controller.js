import React from 'react'
import PromptControllerList from './prompt_controller_list'
import PromptControllerPalette from './prompt_controller_palette'
import PromptControllerDirectional from './prompt_controller_directional'
import PromptBrushConfig from './prompt_brush_config'
class PromptController extends React.Component{
    Palette = React.createRef()

    scrollBasic(e){
        e.stopPropagation()
    }
    
    controllerDown(){
        this.props.mother_this.setState({action:'idle'})
    }

    render(){
        return (<div className={'controller prompt_controller'} onWheel={this.scrollBasic.bind(this)} onPointerDown={this.controllerDown.bind(this)}>
            <PromptControllerList palette={this.Palette} mother_state={this.props.mother_state} mother_this={this.props.mother_this}></PromptControllerList>
            <PromptControllerPalette ref={this.Palette} mother_state={this.props.mother_state} mother_this={this.props.mother_this}></PromptControllerPalette>
            <PromptControllerDirectional mother_state={this.props.mother_state} mother_this={this.props.mother_this}></PromptControllerDirectional>
            <PromptBrushConfig mother_state={this.props.mother_state} mother_this={this.props.mother_this}></PromptBrushConfig>
            
        </div>)
    }
}
export default PromptController