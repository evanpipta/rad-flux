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
 *                         	 These can just be null
 
 */
class Actions {

	constructor(actions) {
		this.actions = actions;
		for (const each in actions) {
			// Make the actions non-writable so you can't replace them
			Object.defineProperty(this.actions, key, {
				writable: false, 
				value: {
					subscribers: [],
					func
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
	 * @param {String} key 		- the action's name
	 * @param {Function} func - the action's internal function, what it actually does.
	 */
	register(key, func) {
		if (typeof key !== 'string') throw new TypeError('Actions.register: key argument must be a string');
		if (typeof func !== 'function') throw new TypeError('Actions.register: func argument must be a function');
		if (this.actions[key] === undefined) throw new Error('Actions.register: action not declared initially, please add it to the constructor');
		if (this.actions[key] !== null) throw new Error('Actions.register: action already registered');
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
	 * @param {String} key 					- the action's name
	 * @param {Function} callback 	- callback to do something when the action is completed
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
	 * @param {String} key 			 - the action name
	 * @param {String} callback  - a reference to a particular callback function subscribed to the action
	 *                           	 Actions.on() returns a reference to it
	 */
	unsubscribe(key, callback) {
		const action = this.actions[key];
		if (action) {
			for (let i = 0; i < action.subscribers.length; i++) {
				const each = action.subscribers[i];
				if (each.id === id) {
					action.subscribers.splice(i, 1);
					return;
				}
			}
		}
	}


}

/**
 * Data store base class
 *
 * To use, create a new instance, then call setState.
 *
 * e.g.
 * const myStore = new DataStore({ hello: 'world' });
 * myStore.setState({ hello: 'hey' });
 *
 * To delete a key, set it to null:
 * myStore.setState({ hello: 'hey' });
 *
 * To listen for changes, use onStateChanged:
 * myStore.onStateChanged((newState) => {
 *   console.log(newState);
 * });
 *
 * To unlisten to changes, use unsubscribe. Pass in a reference to the callback function
 * myStore.unsubscribe(callback);
 * 
 */
class DataStore {
	
	constructor(initState) {
		this.state = initState || {};
		this.subscribers = [];
	}

	/**
	 * Non-destructive set state (Same as react components)
	 * Set a key to null or undefined to delete it
	 * 
	 * Obj is the new object, "stem" is the one we're changing
	 * I pass "stem" in rather than referring to this.state directly in order to make this recursive
	 *
	 */
	setState(newState, stem = this.state) {
		if (typeof newState !== 'object' || newState === null) {
			throw new TypeError('DataStore.setState: newState must be an object');
		}

		for (const key in newState) {
			if (newState[key] === null || newState[key] === undefined) {
				delete stem[key];
			} else if (typeof newState[key] === 'object' && typeof stem[key] === 'object') {
				this.setState(newState[key], stem[key]);
			} else {
				stem[key] = newState[key];
			}
		}

		// Only do callback on "outer" recursie layer
		if (stem === this.state) {
			for (const each of this.subscribers) {
				each(this.state);
			}
		}
	}

	// Essentially the same as just setting .state directly, but it calls the subscribers
	// Data must be an object
	replaceState(newState) {
		if (typeof newState !== 'object' || newState === null) return;
		this.state = newState;
		for (const each of this.subscribers) {
			each(this.state);
		}
	}

	// Subscribe to state changes
	onStateChanged(callback) {
		if (typeof callback === 'function' && !this.subscribers.includes(callback)) {
			this.subscribers.push(callback);
			return callback;
		}
	}

	// Unsubscribe by passing in the same function
	unsubscribe(callback) {
		for (let i = 0; i < this.subscribers.length; i++) {
			if (callback === this.subscribers[i]) {
				this.subscribers.splice(i, 1);
				return;
			}
		}
	}

}

module.exports = { Actions, DataStore };
