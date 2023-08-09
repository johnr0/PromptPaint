import React from 'react'
import Canvas from './canvas/canvas.js'
import './App.css';

class Main extends React.Component{
    state={
        height: 1080, 
        width: 1920,
    }

    render(){
        return (<div style={{flex: 'auto', width: '100%', position:'relative', height:'100%', paddingTop:10, paddingBottom:10}} className='row'>
            <Canvas mother_state={this.state}></Canvas>
        </div>)
    }
}
export default Main