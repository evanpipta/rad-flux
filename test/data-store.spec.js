const { expect } = require('chai');
const path = require('path');
const pkg = require('../package.json');
const entryPoint = path.join(__dirname, '..', pkg.main);

let DataStore;

describe('DataStore', () => {

	describe('Test the module', () => {
		it('Should export the DataStore constructor', () => {
			expect(() => {
				DataStore = require(entryPoint).DataStore;
			}).to.not.throw();

			expect(DataStore).to.exist;

			expect(() => {
				const instance = new DataStore();
			}).to.not.throw();
		});
	});


	describe('Test a DataStore instance', () => {

		it('Should take an initial state argument', () => {
			const instance = new DataStore({ something: 'nothing' });
			expect(instance.state).to.deep.equal({ something: 'nothing' });
		});


		it('Should have a setState method that changes the state', () => {
			const instance = new DataStore({ something: 'nothing' });
			expect(instance.state.something).to.equal('nothing');
			expect(typeof instance.setState).to.equal('function');
			expect(() => {
				instance.setState({ something: 'otherThing' });
			}).to.not.throw();
			expect(instance.state.something).to.equal('otherThing');
		});


		it('Should have an onStateChanged method that takes a callback', (done) => {
			const instance = new DataStore();
			timeout = setTimeout(() => {
				throw new Error('Never called onStateChanged callback');
			}, 500)
			expect(instance.onStateChanged(() => {
				clearTimeout(timeout);
				done();
			}));
			instance.setState({
				name: 'Tame Impala'
			});
		});


		it('Should allow multiple callbacks with onStateChanged', (done) => {
			const instance = new DataStore();
			let callbacksDone = 0; // record number of callbacks

			const clearDatShit = setTimeout(() => {
				throw new Error('Never called both onStateChanged callbacks');
			}, 500);

			// Once both callbacks are called, we are done
			instance.onStateChanged(() => {
				if (callbacksDone) {
					clearTimeout(clearDatShit);
					done();
				}
				callbacksDone++;
			});

			instance.onStateChanged(() => {
				if (callbacksDone) {
					clearTimeout(clearDatShit);
					done();
				}
				callbacksDone++;
			});

			instance.setState({
				name: 'Tame Impala'
			});
		});


		it('Should pass the state into the state changed callback as an argument', (done) => {
			const instance = new DataStore();

			expect(instance.onStateChanged((newState) => {
				expect(newState).to.deep.equal({
					name: 'Tame Impala',
					bestAlbums: [{ name: 'Currents', year: 2015 }]
				});
				done();
			}));

			instance.setState({
				name: 'Tame Impala',
				bestAlbums: [{ name: 'Currents', year: 2015 }]
			});
		});


		it('setState should ignore existing values', () => {
			const instance = new DataStore({ something: 'everything' });
			instance.setState({
				everything: 'nothing'
			});
			expect(instance.state).to.deep.equal({
				something: 'everything',
				everything: 'nothing'
			});
		});


		it('setState should delete keys that are set to null or undefined', () => {
			const instance = new DataStore({ something: 'everything' });

			instance.setState({ something: null });
			expect(instance.state).to.deep.equal({});

			instance.setState({ anotherThing: 'hello' });
			expect(instance.state).to.deep.equal({ anotherThing: 'hello' });

			instance.setState({ anotherThing: undefined });
			expect(instance.state).to.deep.equal({});
		});


		it('setState should work the same on nested objects', () => {
			const instance = new DataStore({ something: { nothing: 'everything', anything: 'woohoo' } });
			instance.setState({
				something: {
					nothing: null
				}
			});
			expect(instance.state).to.deep.equal({ something: { anything: 'woohoo' } });
		});


		it('setState with any non-object argument should throw an error (including things that extend Object, e.g. Array)', () => {
			const instance = new DataStore({ foo: 1 });
			expect(() => { instance.setState(); }).to.throw();
			expect(() => { instance.setState('string'); }).to.throw();
			expect(() => { instance.setState(null); }).to.throw();
			expect(() => { instance.setState(undefined); }).to.throw();
			expect(() => { instance.setState(0); }).to.throw();
			expect(() => { instance.setState(095325); }).to.throw();
			expect(() => { instance.setState(NaN); }).to.throw();
			expect(() => { instance.setState(false); }).to.throw();
			expect(() => { instance.setState([1, 2, 3]); }).to.throw();
			expect(() => { instance.setState([{ blah: 'blah' }]); }).to.throw();
		});


		it('replaceState should replace the state', () => {
			const instance = new DataStore({ foo: 1 });
			instance.replaceState({ bar: 0 });
			expect(instance.state).to.deep.equal({ bar: 0 });
		});


		it('onStateChanged should return a reference to the callback function', () => {
			const instance = new DataStore();
			const fn = function() { /* State changed */ };
			expect(instance.onStateChanged(fn)).to.equal(fn);
		});


		it('Should have an unsubscribe method that removes the callback', (done) => {
			const instance = new DataStore();

			const fn = instance.onStateChanged(() => {
				throw new Error('Should never get here');
			});

			instance.unsubscribe(fn);
			instance.setState({ new: 'state' });

			// Set a timeout to make sure it doesn't finish the test and then call the callback later
			setTimeout(() => {
				done();
			}, 100);
		});


		it('unsubscribe should only remove one specific callback', (done) => {
			const instance = new DataStore({ isNewState: false });
			let callbacksDone = 0; // record number of callbacks

			const timeout = setTimeout(() => {
				throw new Error('Shuld never get here');
			}, 500);

			const fn1 = instance.onStateChanged(() => {
				if (callbacksDone) {
					clearTimeout(timeout);
					done();
				}
				callbacksDone++;
			});

			const fn2 = instance.onStateChanged(() => {
				throw new Error('Should never get here');
			});

			const fn3 = instance.onStateChanged(() => {
				if (callbacksDone) {
					clearTimeout(timeout);
					done();
				}
				callbacksDone++;
			});

			instance.unsubscribe(fn2);
			instance.setState({
				isNewState: true
			});

		});

	});

});

