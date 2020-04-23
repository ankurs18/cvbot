import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Botui from 'botui-react';



class App extends Component {
  componentDidMount() {
    this.botui.message.bot({
        content: "Hello World",
        delay: 1000
    });
    this.botui.action.text({
        action: {
            placeholder: "Enter your text here"
        }
    });
  }

  render() {return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Botui ref={ cmp => this.botui = cmp } />
      </header>
    </div>
  );
}

}

export default App;
