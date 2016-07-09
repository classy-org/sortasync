var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect = chai.expect,
    Q = require('q'),
    Sortasync = require('../dist/sortasync.bundle.js');

chai.use(chaiAsPromised);


/* -------------------------------------------------------------------------- *
 * Test Utils
 * -------------------------------------------------------------------------- */

function asyncTest(cb) {
  var deferred = Q.defer();
  setTimeout(function() {
    cb(deferred);
  });
  return deferred.promise;
}


/* -------------------------------------------------------------------------- *
 * Test Promises
 * -------------------------------------------------------------------------- */

function getA() {
  return asyncTest(function(deferred) {
    deferred.resolve('A');
  });
}

function getB() {
  return asyncTest(function(deferred) {
    deferred.resolve('B');
  });
}

function oneDep(getA) {
  return asyncTest(function(deferred) {
    deferred.resolve(getA + 'C');
  });
}

function twoDeps(getA, getB) {
  return asyncTest(function(deferred) {
    deferred.resolve(getA + getB + 'D');
  });
}

function nestedDeps(getA, oneDep) {
  return asyncTest(function(deferred) {
    deferred.resolve(getA + oneDep + 'E');
  });
}

function deeplyNestedDeps(oneDep, nestedDeps) {
  return asyncTest(function(deferred) {
    deferred.resolve(oneDep + nestedDeps + 'F');
  });
}

function deeplyNestedWithArgs(oneDep, arg1, arg2, nestedDeps) {
  return asyncTest(function(deferred) {
    deferred.resolve(oneDep + arg1 + arg2 + nestedDeps + 'G');
  });
}

function topLevelRejection() {
  return asyncTest(function(deferred) {
    deferred.reject('top level rejection reason');
  });
}

function dependentRejection(getB) {
  return asyncTest(function(deferred) {
    deferred.reject('dependent rejection reason');
  });
}

function dependsOnRejected(topLevelRejection) {
  return asyncTest(function(deferred) {
    deferred.resolve();
  });
}

function nonStringRejection(getB) {
  return asyncTest(function(deferred) {
    deferred.reject({ arbitrary: 'object' });
  });
}

function exceptionError() {
  notafunction();
  return asyncTest(function(deferred) {
    deferred.resolve(getA + 'C');
  });
}


/* -------------------------------------------------------------------------- *
 * Tests
 * -------------------------------------------------------------------------- */

describe('sortasync', function() {

  it('should handle a function with only args', function() {
    config = {
      _args: ['arg1', 'arg2']
    };
    return expect(new Sortasync(config).exec('H', 'I')).to.eventually.deep.equal({ 
      arg1: 'H', 
      arg2: 'I' 
    });
  });

  it('should retain the order of args passed in', function() {
    config = {
      _args: ['arg2', 'arg1']
    };
    return expect(new Sortasync(config).exec('H', 'I')).to.eventually.deep.equal({ 
      arg1: 'I', 
      arg2: 'H' 
    });
  });

  it('should handle a single independent function', function() {
    config = {
      getA: getA
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A' 
    });
  });

  it('should handle multiple independent functions', function() {
    config = {
      getA: getA,
      getB: getB
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B' 
    });
  });

  it('should handle functions with one dependency', function() {
    config = {
      getA: getA,
      getB: getB,
      oneDep: oneDep
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      oneDep: 'AC' 
    });
  });

  it('should handle functions with multiple dependencies', function() {
    config = {
      getA: getA,
      getB: getB,
      twoDeps: twoDeps
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      twoDeps: 'ABD' 
    });
  });

  it('should not depend on config ordering', function() {
    config = {
      twoDeps: twoDeps,
      getA: getA,
      getB: getB
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      twoDeps: 'ABD' 
    });
  });

  it ('should support explicit dependency annotation', function() {
    config = {
      getA: [getA],
      getB: [getB],
      twoDeps: ['getA', 'getB', twoDeps]
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      twoDeps: 'ABD' 
    });
  });

  it ('should support reordering via explicit dependency annotation', function() {
    config = {
      getA: [getA],
      getB: [getB],
      twoDeps: ['getB', 'getA', twoDeps]
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      twoDeps: 'BAD' 
    });
  });

  it('should handle functions with nested dependencies', function() {
    config = {
      getA: getA,
      getB: getB,
      oneDep: oneDep,
      nestedDeps: nestedDeps
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      oneDep: 'AC', 
      nestedDeps: 'AACE' 
    });
  });

  it('should handle functions with deeply nested dependencies', function() {
    config = {
      getA: getA,
      getB: getB,
      oneDep: oneDep,
      nestedDeps: nestedDeps,
      deeplyNestedDeps: deeplyNestedDeps
    };
    return expect(new Sortasync(config).exec()).to.eventually.deep.equal({ 
      getA: 'A', 
      getB: 'B', 
      oneDep: 'AC', 
      nestedDeps: 'AACE', 
      deeplyNestedDeps: 'ACAACEF' 
    });
  });

  it('should handle functions with args passed in', function() {
    config = {
      _args: ['arg1', 'arg2'],
      getA: getA,
      getB: getB,
      oneDep: oneDep,
      nestedDeps: nestedDeps,
      deeplyNestedWithArgs: deeplyNestedWithArgs
    };
    return expect(new Sortasync(config).exec('H', 'I')).to.eventually.deep.equal({ 
      arg1: 'H', 
      arg2: 'I', 
      getA: 'A', 
      getB: 'B', 
      oneDep: 'AC', 
      nestedDeps: 'AACE', 
      deeplyNestedWithArgs: 'ACHIAACEG' 
    });
  });

  it('should gracefully handle top-level rejections', function() {
    config = {
      getA: getA,
      oneDep: oneDep,
      topLevelRejection: topLevelRejection
    };
    return expect(new Sortasync(config).exec()).to.eventually.be.rejected.and.satisfy(function(err) {
      return err instanceof Error
      && err.name === 'RejectionError'
      && err.message === 'top level rejection reason'
      && err.sortasync.step === 'topLevelRejection'
      && err.sortasync.reason === 'top level rejection reason';
    });
  });

  it('should gracefully handle rejections in nested calls', function() {
    config = {
      getA: getA,
      getB: getB,
      dependentRejection: dependentRejection
    };
    return expect(new Sortasync(config).exec()).to.eventually.be.rejected.and.satisfy(function(err) {
      return err instanceof Error
      && err.name === 'RejectionError'
      && err.message === 'dependent rejection reason'
      && err.sortasync.step === 'dependentRejection'
      && err.sortasync.reason === 'dependent rejection reason';
    });
  });

  it('should correctly decorate errors that occur up the chain', function() {
    config = {
      getA: getA,
      getB: getB,
      topLevelRejection: topLevelRejection,
      dependsOnRejected: dependsOnRejected
    };
    return expect(new Sortasync(config).exec()).to.eventually.be.rejected.and.satisfy(function(err) {
      return err instanceof Error
      && err.name === 'RejectionError'
      && err.message === 'top level rejection reason'
      && err.sortasync.step === 'topLevelRejection' // not dependsOnRejected
      && err.sortasync.reason === 'top level rejection reason';
    });
  });

  it('should gracefully handle non-string rejection', function() {
    config = {
      getA: getA,
      getB: getB,
      nonStringRejection: nonStringRejection
    };
    return expect(new Sortasync(config).exec()).to.eventually.be.rejected.and.satisfy(function(err) {
      return err instanceof Error
      && err.name === 'RejectionError'
      && err.message === ''
      && err.sortasync.step === 'nonStringRejection'
      && err.sortasync.reason.arbitrary === 'object';
    });
  });

  it('should gracefully handle general exceptions', function() {
    config = {
      getA: getA,
      getB: getB,
      exceptionError: exceptionError
    };
    return expect(new Sortasync(config).exec()).to.eventually.be.rejected.and.satisfy(function(err) {
      return err instanceof Error
      && err.name === 'ReferenceError'
      && err.message === 'notafunction is not defined'
      && err.sortasync.step === 'exceptionError'
      && err.sortasync.reason === null
    });
  });

});
