/**
 * 
 * A class for registering actions that do stuff, calling them, and subscribing to the results
 *
 *
 * ### Usage example:
 * 
 * import { Actions } from 'flux-minimal';
 * 
 * // Create a new actions instance with your initial set of actions
 * let myActions = new Actions({
 *   'doCoolStuff': null,
 * })
 *
 * // Add side-effects and/or async operations to an action by registering a function:
 * myActions.register('doCoolStuff', (done, data) => {
 *   doSomeAsyncStuff(data)
 *    .then((result) => {
 *      done(result); // call done to publish the action to subscribers
 *    });
 * });
 * 
 * // Call the action from anywhere. You can pass in data if a function was registered.
 * myActions.call('doCoolStuff', data); 
 * 
 * // Subscribe to the action from anywhere:
 * myActions.on('doCoolStuff', () => {
 *   console.log('We did some cool stuff');
 * });
 *
 *
 * 
 * @param {Object} actions - Specify the initial actions for an instance in the constructor
 *                           These can just be null
 */
export default class Actions {

  constructor(actions) {
    this.actions = actions;
    for (const key in actions) {
      // Make the actions non-writable so you can't replace them
      Object.defineProperty(this.actions, key, {
        writable: false, 
        value: {
          subscribers: [],
          func: null
        }
      });
    }
  }

  /**
   * Register a function to an action
   * 
   * This is needed if you want your action to be async (e.g. api calls) 
   * Or you don't believe in separating all effects from actions and want to wrap them up in one place
   * 
   * @param {String} key    - the action's name
   * @param {Function} func - the action's internal function, what it actually does.
   */
  register(key, func) {
    if (typeof key !== 'string') throw new TypeError('Actions.register: key argument must be a string');
    if (typeof func !== 'function') throw new TypeError('Actions.register: func argument must be a function');
    if (this.actions[key] === undefined) throw new Error('Actions.register: action not declared, please add it to the constructor');
    if (this.actions[key].func !== null) throw new Error('Actions.register: action already registered');
    Object.defineProperty(this.actions, key, {
      writable: false, 
      value: {
        subscribers: [],
        func
      }
    });
  }


  /**
   * Call a user action, pass args and a done function to it
   */
  call(key, args) {
    const action = this.actions[key];
    if (action) {
      if (typeof action.func === 'function') {
        // Function registered for this action, allow it to do the work
        const done = this.buildDoneFunction(key);
        action.func(done, args);
      } else {
        // No function registered, so just publish immediately with no data
        this.publish(key);
      }
    }
  }


  /**
   * Factory to generate a "done" function to publish the complete event for a specific action
   * This is passed into each action's function as the "callback" for when the action is done
   */
  buildDoneFunction(key) {
    const actions = this;
    return (function(data) {
      actions.publish(key, data);
    });
  }


  /**
   * Call all subscriber callbacks of an action and pass the data to them
   */
  publish(key, data) {
    const action = this.actions[key];
    if (action) {
      for (const each of action.subscribers) {
        each(data);
      }
    }
  }


  /**
   * Subscribe to an action with a callback
   * 
   * This currently does NOT check for duplicates, and there's no way to unsubscribe
   * So be careful about memory usage from subscribing to actions for now
   * 
   * In the future we can add an unsubscribe method
   * 
   * @param {String} key          - the action's name
   * @param {Function} callback   - callback to do something when the action is completed
   *
   * @return {Function|undefined} - a reference to the callback function. can be used to unsubscribe
   */
  on(key, callback) {
    if (typeof key !== 'string') throw new TypeError('Actions.on: key argument must be a string');
    if (typeof callback !== 'function') throw new TypeError('Actions.on: callback argument must be a function');
    if (!this.actions[key].subscribers.includes(callback)) {
      this.actions[key].subscribers.push(callback);
      return callback;
    }
  }


  /**
   * Remove a callback from an action
   * 
   * @param {String} key       - the action name
   * @param {String} callback  - a reference to a particular callback function subscribed to the action
   *                             Actions.on() returns a reference to it
   */
  unsubscribe(key, callback) {
    const action = this.actions[key];
    if (action) {
      for (let i = 0; i < action.subscribers.length; i++) {
        if (callback === action.subscribers[i]) {
          action.subscribers.splice(i, 1);
          return;
        }
      }
    }
  }


};

