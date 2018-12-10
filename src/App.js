import React, { Component } from 'react';
import { EventEmitter } from 'events';
import { Dispatcher } from 'flux';
import logo from './logo.svg';
import './App.css';

import storyContent from './story.json'
let Story = require('inkjs').Story;
const ink = new Story(storyContent);


const GameActions = dispatcher =>
({
    makeChoice(choice) {
        dispatcher.handleAction({type: 'CHOICE', index: choice})
    }
})

class GameDispatcher extends Dispatcher {
    handleAction(action) {
        // console.log('dispatching action:', action)
        this.dispatch({
            source: 'UI',
            action
        })
    }
}

class GameStore extends EventEmitter {
    constructor(story, dispatcher) {
        super()
        this._story = story
        this._chunk = []
        this._location = ''
        this._score = 0
        this._inventory = []
        this._story.ObserveVariable('location', this.watchHandler.bind(this))
        this._story.ObserveVariable('score', this.watchHandler.bind(this))
        this._story.ObserveVariable('inventory', this.watchHandler.bind(this))
        this.dispatcherIndex = dispatcher.register( this.dispatch.bind(this) )
    }

    watchHandler(name, value) {
        // console.log(`watch: ${name} = ${value.toString()}`)
        this['_' + name] = value.toString()
    }

    get story() {
        this._chunk = []
        while ( this._story.canContinue ){
            this._chunk.push({'type': 'para', 'value': this._story.Continue()})
            this._chunk.push({'type': 'tags', 'value': this._story.currentTags})
        }
        return this._chunk
    }
    get choices() {
        return this._story.currentChoices
    }
    get inventory() {
        return this._inventory
    }
    get location() {
        return this._location
    }
    get max_score() {
        return this._story.variablesState['max_possible_score']
    }
    get score() {
        return this._score
    }

    dispatch(payload) {
        // console.log('payload', payload)
        const { type, index } = payload.action
        switch (type) {
            case 'CHOICE':
                this._story.ChooseChoiceIndex(index)
                this.emit("CHOICEMADE", payload.action)
                return true
            default:
                return false
        }

    }
}

const gameDispatcher = new GameDispatcher()
const gameActions = new GameActions(gameDispatcher)
const gameStore = new GameStore(ink, gameDispatcher)

function getGameState() {
    return {
        story: gameStore.story,
        choices: gameStore.choices,
        location: gameStore.location,
        score: gameStore.score,
        max_score : gameStore.max_score,
        inventory: gameStore.inventory
    }
}

// UI //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function Location(props) {
    if (props.location) {
        return <strong className="location">In the { props.location }</strong>
    }
    return null
}

function Chunk(props) {
    return props.story.map((obj, i) => {
        switch(obj.type) {
            case "para": return <Text key={i} text={obj.value} />
            case "tags": return <Tags tags={obj.value} />
            default:
        }
        return ''
    })
}
function Text(props) {
    return <p key={props.key}>{ props.text }</p>
}

function Tags(props) {
    // Printing tags into the flow of the story for debugging / demo purposes.
    // In practice they would likely trigger game events
    return props.tags.map((tag, i) =><strong key={i}>{tag}</strong>)
}

function Score(props) {
    return <strong className="score">Score: {props.score}/{props.max}</strong>
}

function Inventory(props) {
    if (!props.items) return null
    return  <div className="inventory">
                You are carrying: { props.items || 'nothing'}
            </div>
}

function Choices(props) {
    function handleChoice(choice) {
        gameActions.makeChoice(choice.index)
    }
    return <div className="choices">
            {props.choices.map((choice, i) =>
                <button className="choice" key={i} onClick={() => handleChoice(choice)}>
                    { choice.text }
                </button>
            )}
           </div>
}

class App extends Component {
    constructor(props) {
        super(props)
        this.state = getGameState()
    }

    componentDidMount() {
        gameStore.addListener('CHOICEMADE', () => this.handleChoiceMade(), this)
    }
    render() {
        const {story, choices, location, score, max_score, inventory} = this.state
        return (
            <div className="App">
                <header className="App-header">
                <img src={logo} className="App-logo" alt="logo"/>
                </header>
                <Location location={location}/>
                <Score score={score} max={max_score}/>
                <Chunk story={story}/>
                <Choices choices={choices}/>
                <Inventory items={inventory}/>
            </div>
        );
    }

    handleChoiceMade() {
        this.setState(getGameState())
    }
}

export default App;
