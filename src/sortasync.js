'use strict';

class Sortasync {

  constructor(config) {

    this.program = new Map();

    for (let key in config) {
      switch (key) {

        case '_args':
          config[key].forEach((paramKey, i) => {
            this.program.set(paramKey, {
              type: 'argument',
              index: i
            });
          });
          break;

        default:
          let [fn, dependencies] = this.parseOperation(config[key]);

          this.program.set(key, {
            type: 'operation',
            operation: fn,
            dependencies: dependencies
          });
      }
    }

  }

  exec() {

    let args = Array.from(arguments),
        pending = new Map();

    let go,
        whenWired = new Promise(resolve => go = resolve);               

    this.program.forEach((step, name) => {

      let value;

      switch (step.type) {

        case 'argument':
          value = args[step.index];
          break;

        case 'operation':
          value = whenWired
            .then(() => {
              let depVals = step.dependencies.map(name => pending.get(name));
              return Promise.all(depVals);
            })
            .then(resolvedDeps => step.operation(...resolvedDeps))
            .catch(err => this.normalizeRejection(err, name));
      }

      pending.set(name, value);

    });

    go();

    return Promise.all(pending.values()).then(results => this.mapResults(results));

  }

  mapResults(resolvedOps) {

    let keys = this.program.keys(),
        results = {};

    resolvedOps.forEach(resolvedValue => {
      results[keys.next().value] = resolvedValue;
    });

    return results;
    
  }

  normalizeRejection(err, name) {

    let normalized;

    if (err instanceof Error) {
      normalized = err;
      normalized.sortasync = normalized.sortasync || { step: name, reason: null };
    }
    else {
      let msg = typeof err === "string" ? err : '';
      normalized = new Error(msg);
      normalized.name = 'RejectionError';
      normalized.sortasync = {
        step: name,
        reason: err
      };
    }

    throw normalized;

  }

  parseOperation(op) {

    let ARROW_ARGS = /^([^\(^\)]+?)\s*=>/,
        STD_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m,
        FN_ARG = /^\s*(\S+?)\s*$/,
        STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    let fn = op,
        dependencies = [];

    if (typeof op === 'function' && op.length) {

      let fnStr = Function.prototype.toString.call(op) + ' ';
      let fnStrCln = fnStr.replace(STRIP_COMMENTS, '');
      let fnArgMatches = fnStrCln.match(ARROW_ARGS) || fnStrCln.match(STD_ARGS);
      let fnArgArr = fnArgMatches ? fnArgMatches[1].split(',') : [];

      fnArgArr.forEach(arg => {
        dependencies.push(arg.trim());
      });

    } 
    else if (Array.isArray(op)) {
      let last = op.length - 1;
      fn = op[last];
      dependencies = op.slice(0, last);
    }

    return [fn, dependencies];

  }

}

module.exports = Sortasync;
