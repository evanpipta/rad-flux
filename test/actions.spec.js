const { expect } = require('chai');
const path = require('path');
const pkg = require('../package.json');
const entryPoint = path.join(__dirname, '..', pkg.main);

let Actions;

describe('Actions', () => {

  describe('Test the module', () => {
    it('Should export the Actions constructor', () => {
      expect(() => {
        Actions = require(entryPoint).Actions;
      }).to.not.throw();

      expect(Actions).to.exist;
    });
  });


  describe('Test an Actions instance', () => {

    it('Should be a constructor', () => {
      expect(() => {
        const instance = new Actions();
      }).to.not.throw();
    });


    it('Should take default actions', () => {
      const instance = new Actions({ myAction: null });

      expect(instance.actions.myAction).to.exist;
    });


    it('Should have an on method that adds a function to the subscribers', () => {
      const instance = new Actions({ myAction: null });

      instance.on('myAction', () => {});
      expect(instance.actions.myAction.subscribers.length).to.equal(1);
    });


    it('Should not subscribe twice with the same function', () => {
      const instance = new Actions({ myAction: null });

      let func = () => {};

      instance.on('myAction', func);
      instance.on('myAction', func);

      expect(instance.actions.myAction.subscribers.length).to.equal(1);
    });


    it('Should do a synchronous callback on actions that have no registered function', (done) => {
      const instance = new Actions({ myAction: null });

      const timeout = setTimeout(() => {
        throw new Error('If this happened, unregistered action was not synchronous');
      }, 0);

      instance.on('myAction', () => {
        clearTimeout(timeout);
        done();
      });

      instance.call('myAction');
    });

    it('Should be able to pass data without being async', (done) => {
      const instance = new Actions({ myAction: null });

      instance.on('myAction', (data) => {
        expect(data.test).to.equal(true);
        done();
      });

      instance.call('myAction', { test: true });
    });

    it('Should allow registering an asynchronous function to an action', (done) => {
      const instance = new Actions({ myAction: null });

      instance.registerAsync('myAction', (callback) => {
        setTimeout(callback, 50);
      });

      const timeout = setTimeout(() => {
        throw new Error('If this happened, async action never reached callback');
      }, 100);

      instance.on('myAction', () => {
        clearTimeout(timeout);
        done();
      });

      instance.call('myAction');
    });


    it('Should not allow registering to an action that does not exist yet', () => {
      const instance = new Actions({ myAction: null });
      expect(() => {
        instance.registerAsync('NonAction', () => {});
      }).to.throw();
    });


    it('Should not allow registering a new function to an action that already has a registered function', () => {
      const instance = new Actions({ myAction: null });
      instance.registerAsync('myAction', () => {});
      expect(() => {
        instance.registerAsync('myAction', () => {});
      }).to.throw();
    });


    it('Should allow passing data from the caller into the registered function', (done) => {
      const instance = new Actions({ myAction: null });

      instance.registerAsync('myAction', (cb, data) => {
        expect(data).to.deep.equal({ some: 'special data' });
        done();
      });

      instance.call('myAction', { some: 'special data' });
    });


    it('Should allow passing data from the registered function back to callback', (done) => {
      const instance = new Actions({ myAction: null });

      instance.registerAsync('myAction', (cb) => {
        cb({here: { is: 'the stuff' }});
      });

      instance.on('myAction', (theStuff) => {
        expect(theStuff).to.deep.equal({here: { is: 'the stuff' }});
        done();
      });

      instance.call('myAction');
    });


    it('Should return a reference to the callback', () => {
      const instance = new Actions({ myAction: null });

      expect(typeof instance.on('myAction', (cb) => {})).to.equal('function');
    });


    it('Should be able to unsubscribe with the callback reference', (done) => {
      const instance = new Actions({ myAction: null, anotherAction: null });

      let callbacksDone = 0; // record number of callbacks

      const timeout = setTimeout(() => {
        throw new Error('Should never get here');
      }, 500);

      const fn1 = instance.on('myAction', () => {
        if (callbacksDone > 1) {
          clearTimeout(timeout);
          done();
        }
        callbacksDone++;
      });

      const fn2 = instance.on('myAction', () => {
        throw new Error('Should never get here');
      });

      const fn3 = instance.on('myAction', () => {
        if (callbacksDone > 1) {
          clearTimeout(timeout);
          done();
        }
        callbacksDone++;
      });

      const fn4 = instance.on('anotherAction', () => {
        if (callbacksDone > 1) {
          clearTimeout(timeout);
          done();
        }
        callbacksDone++;
      });

      instance.unsubscribe('myAction', fn2);
      instance.call('myAction');
      instance.call('anotherAction');
    });

  });


});