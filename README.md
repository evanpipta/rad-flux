# flux-minimal
Minimalist library for flux architecture with no production dependencies

## Contents:
- [Concepts](#concepts)
- [Usage Guide](#usage-guide)
- [Development](#development)

----------------

## Concepts

`flux-minimal` takes a few key concepts from flux architecture, Actions and Data Stores, and cuts out everything else. It provides a simple, unopinionated, and non-magical interface to implement a simple form of flux architecture. The goal of `flux-minimal` is to be intuitive, easy, and fast to start using.

The only pieces of `flux-minimal` are two constructors: `DataStore` and `Actions`.

A DataStore represents a piece of application state. `flux-minimal` doesn't dictate how these pieces are split up; a `flux-minimal` DataStore can be used to store the entire state of an application, or of a single component. The important thing is that a `flux-minimal` DataStore has a non-destructive `setState()` method that publishes change events to subscribers.

An instance of Actions in `flux-minimal` represents one group of actions that can be done within an application. Actions are source agnostic, i.e. can be used for actions initiated by the user, or by the program. `flux-minimal` provides an interface to call actions and subscribe to action calls from anywhere. It supports synchronous and asynchronous actions, and does not dictate whether or not actions should have built-in side effects.

`flux-minimal` has no reducers, dispatchers, or other concepts found in other flux implementations. It really boils down to two simple "flows":
 - You create a store, listen to changes to that store's state from anywhere (and change it from anywhere), and then decide what to do next.
 - You create actions, listen for when they happen from anywhere (and make them happen from anywhere), and then decide what to do next.

Where you go from there is up to you.

----------------

## Usage guide

### Installation
`npm install --save flux-minimal`


### Using DataStore

Creating a new DataStore:
```javascript
// stores/my-data-store.js
const { DataStore } = require('flux-minimal');

const initialState = {};

// The recommended usage is to export a single instance of the store
// This way, any scripts importing/requiring your store will share the same isntance
module.exports = new DataStore(initialState);
```

Importing your store into another script and changing its state:
```javascript
// app.js
const myDataStore = require('./stores/my-data-store.js');

myDataStore.onStateChanged(() => {
  console.log(myDataStore.state.hello); // "world"
});

myDataStore.setState({
  hello: 'world'
});
```

Removing existing values:
```javascript
myDataStore.setState({ hello: 'world' });

console.log(myDataStore.state.hello);   // "world"

myDataStore.setState({ hello: null });
console.log(myDataStore.state.hello);   // undefined
console.log(myDataStore.state);         // {}
```

Changing values of nested objects:
```javascript
myDataStore.setState({
  nested: {
    foo: 1,
    bar: 2
  }
});
console.log(myDataStore.state.nested);  // { foo: 1, bar: 2 }

myDataStore.setState({
  nested: { foo: 10 }
});
console.log(myDataStore.state.nested);  // { foo: 10, bar: 2 }

myDataStore.setState({
  nested: { foo: null }
});
console.log(myDataStore.state.nested);  // { bar: 2 }
```

Unsubscribing from changes:
```javascript
// onStateChanged returns a reference to the callback
const ref = myDataStore.onStateChanged(() => {
  // do something
});

// Pass it to unsubscribe to remove the callback
// This is useful if you need to do something only once... 
// you can unsubscribe inside of the callback
// If you're using react, it's also a good idea to unsubscribe any 
// callbacks added by a component when it unmounts
myDataStore.unsubscribe(ref);
```

Replacing the state entirely:
```javascript
myDataStore.setState({
  loggedIn: true,
  userData: {
    name: 'you',
    superSecretInfo: 'you don\'t want to know'
  }
});

// FYI replaceState will call subscribers listening to onStateChanged, just like setState
myDataStore.replaceState({
  loggedIn: false
});

console.log(myDataStore.state); // { loggedIn: false }
```


### Using Actions

To create an Actions instance, pass in the keys of all the actions you will be using to the constructor:
```javascript
// actions/my-actions.js
const { Actions } = require('flux-minimal');

// Set the keys to null.
const myActions = new Actions({
  'doStuff': null
});

// Again export a single instance so other scripts all reference the same instance
module.exports = myActions;

// The reason we pass in an object here instead of an array is to avoid generating
// a bunch of "hidden classes" when iterating over the actions to create the internal object
```


Simple (instant) callback:
```javascript
// app.js
const myActions require('./actions/my-actions.js');

// Do something when an action happened
myActions.on('doStuff', () => {
  console.log('yo');
});

// Make the action happen
myActions.call('doStuff');
```


Asynchronous actions:
```javascript
// To make an asynchronous action, use .register. This will register a function to an EXISTING action.
// The action must have been created already in the constructor.
const myActions = new Actions({
  'doStuff': null
});
 
myActions.register('doStuff', (done) => {
  doSomeAsyncStuff()
    .then(() => {
      done();       // call done when all async operations complete to "publish" the action to subscribers
    });
});

myActions.on('doStuff', () => {
  // Won't reach this point until doSomeAsyncStuff() is complete.
});

myActions.call('doStuff');
```

Asynchronous actions that take data:
```javascript
// If we want to do something like call an API, 
// and need the action to take params or other data, we can do this:
myActions.register('callAnApi', (done, args) => {
  console.log(args); // { foo: 'bar' }
  someApiCallThatTakesArguments(args)
    .then(() => {
      done();
    });
});

// The second argument will be passed into the registered function for this action
myActions.call('callAnApi', {
  foo: 'bar'
});
```


Asynchronous actions that call back with data:
```javascript
// Send results from the async operation back to the subscribers:
myActions.register('callAnApi', (done, args) => {
  someApiCallThatTakesArguments(args)
    .then((response) => {
      done(response);
    });
});

// Now we can subscribe to 'callAnApi' action from anywhere and see the results
myActions.on('callAnApi', (response) => {
  console.log(response); // whatever the aPI responded with
});

myActions.call('callAnApi', {
  foo: 'bar'
});
```


Unsubscribing:
```javascript
// Unsubscribing works almost identically for Actions as it does for DataStore:
const subscriber = myActions.on('someAction', () => {
  // ...
});

myActions.unsubscribe('someAction', subscriber);

// ------- Alternatively ----------

function callback() {
  // ...
}

myActions.on('someAction', callback);

myActions.unsubscribe('someAction', callback);

```


### Putting together the DataStore and Actions (one possible way to do it):

```javascript
// data-stores/my-data-store.js
const { DataStore } = require('flux-minimal');
const myActions = require('./actions/my-actions');

const myDataStore = module.exports = new DataStore({});

myActions.on('submitTheAwesomeForm', (response) => {
  myDataStore.setState(response.data || response.error);
});
```
```javascript
// actions/my-actions.js
const { Actions } = require('flux-minimal');

const myActions = module.exports = new Actions({
  'submitTheAwesomeForm':
});

myActions.register('submitTheAwesomeForm', (done, formData) => {
  callTheApi(formData)
    .then((response) => {
      done(response);
    })
    .catch((error) => {
      done({ error });
    });
});

```
```javascript
// app.js
const myActions = require('./actions/my-actions');
const myDataStore = require('./data-stores/my-data-store');

console.log(myDataStore.state); // Does not contain anything

myDataStore.onStateChanged(() => {
  console.log(myDataStore.state); // Now it contains the data that resulted from the user's action
});

function userSubmittedAwesomeForm(formData) {
  myActions.call('submitTheAwesomeForm', formData);
}

```

### Further examples

Coming later


----------------

## Development

`git clone https://github.com/747823/flux-minimal.git` to get repo
`npm install` to get developer dependencies
`npm run build` to build distribution files
`npm run test` to run unit tests

