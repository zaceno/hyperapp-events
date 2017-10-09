# hyperapp-events

`hyperapp-events` is an app decorator (a k a "higher order app") which adds an event bus to your app. Hyperapp modules are isolated from one another and can only communicate "top-down". An event bus allows dependency-free communcation between modules where that would otherwise be impossible.


## Installation and Basic Usage

### Via npm

In your project folder:

```sh
npm install hyperapp-events
```

Then import/require `appEvents` in your project, and use it to decorate your app:

```js
const appEvents = require('hyperapp-events')

app(appEvents)({
  ...
})

```

### Via CDN

Add the following script tag to the `<head>...</head>` section of your html page:

```html
<script src="https://unpkg.com/hyperapp-events@latest/dist/hyperapp-events.umd.js"></script>

```

... that will export `appEvents` in your global scope, which you use to decorate your app:


```js
app(appEvents)({
  ...
})
```

## How to use it

With `appEvents` enabled in your hyperapp-app, all actions will receive an `emit` function as the
fourth argument.

```js
{
  ...,

  actions: {
    doFoo: (state, actions, data, emit) { ... },
    doBar: (state, actions, data, emit) { ...}
  }
}

```

The emit function is used to broadcast a message (string) that something happened, along with an payload (any) to provide detail.

```js

emit('fire!', 'south hallway')

```

Any module (or the app itself) that cares about such messages, declares it in their `events` property, which is an object containing all the events the module cares about as property keys, and "event handlers" as values, i e functions for what to do when that event occurs.

Event handlers are passed the state and actions (scoped to the module), and the payload the event was broadcast with as third argument.

```js

const sprinklerSystem = {
  actions: {
    turnOn: (state, actions, room, emit) => {
       ...
       emit('fire out', room) 
     }
  },
  events: {
    'fire!': (state, actions, room) => { actions.turnOn(room) } 
  }
}

const person = {
  actions: {
    runFrom: (state, actions, room) => { ... }
    walkTo: (state, actions, room) => { ... }
  },
  events: {
    'fire!': (state, actions, room) => { actions.runFrom(room) },
    'fire out': (state, actions, room) => { actions.walkTo(room) }
  }
}

```

As demonstrated by the example above, any number of modules could be listening for a single event.

The call to `emit` will return whatever the handler of the event (if any) returns. If there are multiple event handlers for a given event, the returned value will be from the handler called last (highest up in the module tree)

