import React, {Component} from 'react'

class EraserController extends Component{

    toggleSize(e){
        e.stopPropagation();
        if(this.props.mother_state.action=='idle'){
            this.props.mother_this.setState({action:'size'})
        }else{
            this.props.mother_this.setState({action:'idle'})
        }
        
    }

    change_eraser_size(e){
        this.props.mother_this.setState({erase_size: e.target.value})
    }

    render(){
        var pixellength = (this.props.mother_state.pixelheight < this.props.mother_state.pixelwidth)?this.props.mother_state.pixelheight:this.props.mother_state.pixelwidth
        var pixelwidth = this.props.mother_state.pixelwidth
        var pixelheight = this.props.mother_state.pixelheight
        
        var boardheight = this.props.mother_state.boardheight
        var boardwidth = this.props.mother_state.boardwidth

        return (<div className="controller erase_controller">
            <div className='controller_button'>
                <div style={{fontSize: 12, border: 'solid 4px white', width: 36, height: 36, margin: 'auto', paddingTop:'3px',lineHeight:'20px'}} onPointerDown={this.toggleSize.bind(this)}>
                    Size
                </div>
            </div>

            <div className='controller erase_size_controller' style={{border: 'solid 3px #333333', backgroundColor: '#eeeeee',
                display: (this.props.mother_state.control_state=='erase' && this.props.mother_state.action=='size')?'inline-block':'none' }}>
            <div style={{width:'10%', height: '100%', display: 'inline-block', verticalAlign:'bottom'}}>
                <input value={this.props.mother_state.erase_size} type='range' min='1' max='200' orient='vertical' onChange={this.change_eraser_size.bind(this)}></input>
            </div>
            <div style={{width:'90%', height: '100%', display: 'inline-block', overflow:'hidden', position:'relative'}}>
                <div id='erase_size_canvas' width={this.props.mother_state.brush_img.width} height={this.props.mother_state.brush_img.height} 
                style={{width: this.props.mother_state.erase_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom, 
                height: this.props.mother_state.erase_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom,
                position:'absolute', left: 165.6/2-this.props.mother_state.erase_size/pixelwidth*this.props.mother_state.boardwidth*this.props.mother_state.boardzoom/2,
                top: 184/2-this.props.mother_state.erase_size/pixelheight*this.props.mother_state.boardheight*this.props.mother_state.boardzoom/2,
                borderRadius: '50%', border: 'solid 1px #333333'
                }}
                ></div>
            </div>    
            </div>

        </div>)
    }
}

export default EraserController