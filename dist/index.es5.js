'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 *
 * A class for registering actions that do stuff, calling them, and subscribing to the results
 *
 *
 * ### Usage example:
 *
 * import { Actions } from 'rad-flux';
 *
 * // Create a new actions instance with your initial set of actions
 * let myActions = new Actions({
 *   'doCoolStuff': null,
 * })
 *
 * // Add side-effects and/or async operations to an action by registering a function:
 * myActions.registerAsync('doCoolStuff', (done, data) => {
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
var Actions = function () {
  function Actions(actions) {
    _classCallCheck(this, Actions);

    this.actions = actions;
    for (var key in actions) {
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
   * Register a function to an action to make it async
   *
   * This is needed if you want your action to be async (e.g. api calls)
   * Or you don't believe in separating all effects from actions and want to wrap them up in one place
   *
   * @param {String} key    - the action's name
   * @param {Function} func - the action's internal function, what it actually does.
   */


  _createClass(Actions, [{
    key: 'registerAsync',
    value: function registerAsync(key, func) {
      if (typeof key !== 'string') throw new TypeError('Actions.registerAsync: key argument must be a string');
      if (typeof func !== 'function') throw new TypeError('Actions.registerAsync: func argument must be a function');
      if (this.actions[key] === undefined) throw new Error('Actions.registerAsync: action not declared, please add it to the constructor');
      if (this.actions[key].func !== null) throw new Error('Actions.registerAsync: action already registered');
      Object.defineProperty(this.actions, key, {
        writable: false,
        value: {
          subscribers: [],
          func: func
        }
      });
    }

    /**
     * Call a user action, pass data and a done function to it
     */

  }, {
    key: 'call',
    value: function call(key, data) {
      var action = this.actions[key];
      if (action) {
        if (typeof action.func === 'function') {
          // Function registered for this action, allow it to do the work
          var done = this.buildDoneFunction(key);
          action.func(done, data);
        } else {
          // No function registered, so just publish immediately
          this.publish(key, data);
        }
      }
    }

    /**
     * Factory to generate a "done" function to publish the complete event for a specific action
     * This is passed into each action's function as the "callback" for when the action is done
     */

  }, {
    key: 'buildDoneFunction',
    value: function buildDoneFunction(key) {
      var actions = this;
      return function (data) {
        actions.publish(key, data);
      };
    }

    /**
     * Call all subscriber callbacks of an action and pass the data to them
     */

  }, {
    key: 'publish',
    value: function publish(key, data) {
      var action = this.actions[key];
      if (action) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = action.subscribers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var each = _step.value;

            each(data);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
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

  }, {
    key: 'on',
    value: function on(key, callback) {
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

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(key, callback) {
      var action = this.actions[key];
      if (action) {
        for (var i = 0; i < action.subscribers.length; i++) {
          if (callback === action.subscribers[i]) {
            action.subscribers.splice(i, 1);
            return;
          }
        }
      }
    }
  }]);

  return Actions;
}();

function isObject(obj) {
  return obj !== null && obj instanceof Object &&
  // Only reliable way to tell if it's REALLY an object:
  Object.prototype.toString.call(obj) === '[object Object]';
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

var DataStore = function () {
  function DataStore(initState) {
    _classCallCheck(this, DataStore);

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


  _createClass(DataStore, [{
    key: 'setState',
    value: function setState(newState) {
      var stem = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.state;

      if (isObject(newState) === false) {
        throw new TypeError('DataStore.setState: newState must be an object');
      }

      for (var key in newState) {
        var item = newState[key];
        if (item === null || item === undefined) {
          delete stem[key];
        } else if (isObject(item) && isObject(stem[key])) {
          this.setState(item, stem[key]);
        } else {
          stem[key] = newState[key];
        }
      }

      // Only do callback on "outer" recursie layer
      if (stem === this.state) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = this.subscribers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var each = _step2.value;

            each(this.state);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      }
    }

    // Essentially the same as just setting .state directly, but it calls the subscribers
    // Data must be an object

  }, {
    key: 'replaceState',
    value: function replaceState(newState) {
      if ((typeof newState === 'undefined' ? 'undefined' : _typeof(newState)) !== 'object' || newState === null) return;
      this.state = newState;
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.subscribers[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var each = _step3.value;

          each(this.state);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }

    // Subscribe to state changes

  }, {
    key: 'onStateChanged',
    value: function onStateChanged(callback) {
      if (typeof callback === 'function' && !this.subscribers.includes(callback)) {
        this.subscribers.push(callback);
        return callback;
      }
    }

    // Unsubscribe by passing in the same function

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(callback) {
      for (var i = 0; i < this.subscribers.length; i++) {
        if (callback === this.subscribers[i]) {
          this.subscribers.splice(i, 1);
          return;
        }
      }
    }
  }]);

  return DataStore;
}();

module.exports = { Actions: Actions, DataStore: DataStore };
