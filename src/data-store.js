
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
export default class DataStore {
	
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
		if (typeof newState !== 'object' || newState === null || newState.constructor !== Object) {
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
