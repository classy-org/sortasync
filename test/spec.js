var chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    expect = chai.expect,
    Q = require('q'),
    Sortasync = require('../dist/sortasync.bundle.js');

chai.use(chaiAsPromised);


/* -------------------------------------------------------------------------- *
 * Test Utils
 * -------------------------------------------------------------------------- */

function getA() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve('A');
  }, 15);

  return deferred.promise;
}

function getB() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve('B');
  }, 10);

  return deferred.promise;
}

function oneDep(getA) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve(getA + 'C');
  }, 5);

  return deferred.promise;
}

function twoDeps(getA, getB) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve(getA + getB + 'D');
  }, 5);

  return deferred.promise;
}

function nestedDeps(getA, oneDep) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve(getA + oneDep + 'E');
  }, 5);

  return deferred.promise;
}

function deeplyNestedDeps(oneDep, nestedDeps) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve(oneDep + nestedDeps + 'F');
  }, 5);

  return deferred.promise;
}

function deeplyNestedWithArgs(oneDep, arg1, arg2, nestedDeps) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve(oneDep + arg1 + arg2 + nestedDeps + 'G');
  }, 5);

  return deferred.promise;
}

function topLevelRejection() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.reject('top level rejection reason');
  }, 5);

  return deferred.promise;
}

function dependentRejection(getB) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.reject('dependent rejection reason');
  }, 5);

  return deferred.promise;
}

function dependsOnRejected(topLevelRejection) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve();
  }, 5);

  return deferred.promise;
}

function nonStringRejection(getB) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.reject({ arbitrary: 'object' });
  }, 5);

  return deferred.promise;
}

function exceptionError() {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.resolve('exception error');
  }, 5);

  notafunction();

  return deferred.promise;
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
      nonStringRejection: nonStringRejection,
      getB: getB
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
      exceptionError: exceptionError,
      getB: getB
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
