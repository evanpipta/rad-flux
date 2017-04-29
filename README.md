# flux-minimal
Minimalist library for flux architecture with no production dependencies

### Installation
`npm install --save flux-minimal`

or

`npm install --save git+https://github.com/747823/flux-minimal.git`

### Contents:
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

### Using DataStore

**Creating a new DataStore:**
```javascript
const { DataStore } = require('flux-minimal');

const initialState = {};

const myDataStore = new DataStore(initialState);

// I recommend exporting your DataStore instances to share across the app
```

**Changing the DataStore's state:**
```javascript
console.log(myDataStore.state); // {}

myDataStore.setState({
  hello: 'world'
});

console.log(myDataStore.state); // { hello: 'world' }
```

**Removing existing values:**
```javascript
console.log(myDataStore.state); // { hello: 'world' }

myDataStore.setState({ hello: null });

console.log(myDataStore.state); // {}
```

**Changing/removing existing values within nested objects:**
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

**Subscribing to state changes**
```javascript
myDataStore.onStateChanged(() => {
  console.log(myDataStore.state); // { something: 'else' }
});

myDataStore.setState({
  something: 'else'
});
```

**Unsubscribing from state changes:**
```javascript
// onStateChanged returns a reference to the callback
const ref = myDataStore.onStateChanged(() => {
  // ...
});

// Pass it to unsubscribe to remove the callback
myDataStore.unsubscribe(ref);
```

**Replacing the state entirely:**
```javascript
myDataStore.setState({
  loggedIn: true,
  userData: {
    name: 'you',
    superSecretInfo: 'you don\'t want to know'
  }
});

console.log(myDataStore.state); // that whole object up there ^

myDataStore.replaceState({
  loggedIn: false
});

console.log(myDataStore.state); // { loggedIn: false }
```


### Using Actions

**Creating a new set of actions:**
```javascript
const { Actions } = require('flux-minimal');

// Add your action names as keys (the values don't matter)
const myActions = new Actions({
  'doStuff': null,
  'doMoreStuff': null
});

// I recommend exporting your Actions instances to share across the app
```
(Note: the reason we pass in an object here instead of an array is to avoid generating a bunch of "hidden classes" when iterating over the actions to create the internal action objects)


**Subscribing to an action:**
```javascript
myActions.on('doStuff', () => {
  console.log('yo');
});

// Make the action happen
myActions.call('doStuff');
```

**Doing stuff inside of an action:**
```javascript
// To do stuff inside of an action use .register()
myActions.register('doStuff', (done) => {
  doSomeAsyncStuff()
    .then(() => {
      done();       // call done() whenever the stuff the action was doing is complete
                    // there's no distinction between synchronous and asynchronous here, you must always call done()
    });
});

myActions.on('doStuff', () => {
  // Won't reach this point until doSomeAsyncStuff() is complete.
});

myActions.call('doStuff');
```
Note: you can only call .register() once per action, it permanently sets the registered function for that action.

The idea here is to make sure actions themselves only do one thing, from one place. If you want your actions to indirectly cause other "effects", subscribe to them externally and do stuff after they complete.


**Actions that take data and do stuff with it:**
```javascript
// If we want to do something like call an API, and we need to take arguments, we can do this:
myActions.register('callAnApi', (done, args) => {
  console.log(args); // { foo: 'bar' }
  someApiCallThatTakesArguments(args)
    .then(() => {
      done();
    });
});

myActions.call('callAnApi', { foo: 'bar' });
```


**Actions that do stuff and then pass data to their subscribers:**
```javascript
myActions.register('callAnApi', (done, args) => {
  someApiCallThatTakesArguments(args)
    .then((response) => {
      done(response);
    });
});

myActions.on('callAnApi', (response) => {
  console.log(response); // the results of the action, whatever that may be
});

myActions.call('callAnApi', {
  foo: 'bar'
});
```


**Unsubscribing:**
```javascript
// myActions.on returns a ref to the subscriber function, just like DataStore:
const ref = myActions.on('someAction', () => {
  // ...
});

myActions.unsubscribe('someAction', ref);


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
  'submitTheAwesomeForm': null
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

- `git clone https://github.com/747823/flux-minimal.git` to get repo
- `npm install` to get developer dependencies
- `npm run build` to build distribution files
- `npm run test` to run unit tests

