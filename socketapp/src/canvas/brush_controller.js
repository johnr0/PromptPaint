import React, {Component} from 'react'

class BrushController extends Component{

    setColor(e){
        this.props.mother_this.setState({brush_color: e.target.value})
    }

    toggleSize(e){
        e.stopPropagation();
        if(this.props.mother_state.action=='idle'){
            this.props.mother_this.setState({action:'size'})
        }else{
            this.props.mother_this.setState({action:'idle'})
        }
        
    }

    change_brush_size(e){
        this.props.mother_this.setState({brush_size: e.target.value})
    }

    render(){
        var pixelwidth = this.props.mother_state.pixelwidth
        var pixelheight = this.props.mother_state.pixelheight
        return (<div className="controller brush_controller">
            <div className='controller_button'>
                <input type='color' value={this.props.mother_state.brush_color} onChange={this.setColor.bind(this)}
                style={{display:'block', margin:'auto', width: '38px', height: '38px'}}>

                </input>
            </div>
            <div className='controller_button' style={{marginTop: 1}}>
                <div style={{fontSize: 12, border: 'solid 4px white', width: 36, height: 36, margin: 'auto', paddingTop:'3px', lineHeight:'20px'}} onPointerDown={this.toggleSize.bind(this)}>
                    Size
                </div>
            </div>

            <div className='controller brush_size_controller' style={{border: 'solid 3px #333333', backgroundColor: '#eeeeee',
                display: (this.props.mother_state.control_state=='brush' && this.props.mother_state.action=='size')?'inline-block':'none' }}>
            <div style={{width:'10%', height: '100%', display: 'inline-block', verticalAlign:'bottom'}}>
                <input value={this.props.mother_state.brush_size} type='range' min='1' max='200' orient='vertical' onChange={this.change_brush_size.bind(this)}></input>
            </div>
            <div style={{width:'90%', height: '100%', display: 'inline-block', overflow:'hidden', position:'relative'}}>
                <div id='brush_size_canvas' width={this.props.mother_state.brush_img.width} height={this.props.mother_state.brush_img.height} 
                    style={{width: this.props.mother_state.brush_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom, 
                    height: this.props.mother_state.brush_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom,
                    position:'absolute', left: 165.6/2-this.props.mother_state.brush_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom/2,
                    top: 184/2-this.props.mother_state.brush_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom/2,
                    borderRadius: '50%', border: 'solid 1px #333333'
                    }}
                ></div>
            </div>    
            </div>

        </div>)
    }
}

export default BrushController