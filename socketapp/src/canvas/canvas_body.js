import React, {Component} from 'react'

class CanvasBody extends Component{
    renderIntermediateStamp(){
        if(this.props.mother_state.control_state=='content-stamp' && this.props.mother_state.action=='content-stamp'){
            if(this.props.mother_state.content_stamp_init_pos==undefined){
                return
            }
            var width = Math.abs(this.props.mother_state.content_stamp_init_pos[0]-this.props.mother_state.content_stamp_cur_pos[0])
            var height = Math.abs(this.props.mother_state.content_stamp_init_pos[1]-this.props.mother_state.content_stamp_cur_pos[1])
            console.log(width, height)
            var cur_ratio = height/width
            if(cur_ratio > this.props.mother_state.content_stamp_ratio){
                // keep width
                height = this.props.mother_state.content_stamp_ratio * width
            }else{
                // keep height
                width = height / this.props.mother_state.content_stamp_ratio
            }
            
            var startx, starty

            if(this.props.mother_state.content_stamp_init_pos[0]>this.props.mother_state.content_stamp_cur_pos[0]){
                startx = this.props.mother_state.content_stamp_init_pos[0]-width
            }else{
                startx = this.props.mother_state.content_stamp_init_pos[0]
            }

            if(this.props.mother_state.content_stamp_init_pos[1]>this.props.mother_state.content_stamp_cur_pos[1]){
                starty = this.props.mother_state.content_stamp_init_pos[1]-height
            }else{
                starty = this.props.mother_state.content_stamp_init_pos[1]
            }


            return (<img style={{width:(width/10)+'%', height: (height/10)+'%', top: (starty/10)+'%', left: (startx/10)+'%', position:'absolute'}} src={this.props.mother_state.content_stamp_img.src}>

            </img>)
        }
    }

    render(){
        var visi = 'visible'
        var length = this.props.mother_state.boardzoom*this.props.mother_state.boardlength
        if(this.props.mother_state.layers[this.props.canvas_idx]!=undefined){
            if(this.props.mother_state.layers[this.props.canvas_idx].hide==true){
                visi='hidden'
            }
        }
        
        return (<div style={{width: '100%', height: '100%', position:'absolute', top:'0', left: '0', visibility: visi}}>
            
            <canvas id={'sketchpad_canvas_'+this.props.canvas_id} width={this.props.mother_state.pixelwidth} height={this.props.mother_state.pixelheight} style={{width: '100%', position:'absolute', top:'0', left: '0'}}>
            </canvas>
            {this.renderIntermediateStamp()}
        </div>)
    }
}

export default CanvasBody