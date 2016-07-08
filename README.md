# Sortasync

A promise-powered utility for interdependent async calls. 

## What is it?

For one-off async operations, promises are great. For uniform collections [Neo-Async](https://github.com/suguru03/neo-async) is your best friend. But when it comes to complex, interdependent sequences of async calls, it's still difficult to achieve maximum concurrency without a mess of callbacks.

Sortasync solves this problem by blending the best ideas from multiple sources. Features include:

* Super flat, dead simple definition syntax
* Angular-style implicit dependency injection
* Eats and returns promises (from whatever A+ library you throw at it)
* Available for Node, AMD, and the browser

## Basic example

In this contrived example, we fetch relevant information for a user from multiple sources. 

```javascript
var mySequence = new Sortasync({
  user: function() {
    return someApi.getCurrentUser();
  },
  group: function(user) {
    return someApi.getGroupByUser(user.id);
  },
  friends: function(user) {
    return someApi.getFriendsByUser(user.id);
  },
  page: function(user) {
    return someApi.getFriendsByUser(user.id);
  },
  comments: function(page) {
    return someApi.getCommentsByPage(page.id);
  },
  likes: function(page) {
    return someApi.getLikesByPage(page.id);
  }
});

mySequence
  .exec()
  .then(function(response) {
    doSomethingWith(response.user);
    doSomethingWith(response.group);
    doSomethingWith(response.friends);
    doSomethingWith(response.page);
    doSomethingWith(response.comments);
    doSomethingWith(response.likes);
  }));
```

In the example above, `group`, `friends`, and `page` all depend on the resolved value of the `user` operation. They will fire concurrently as soon as `user` is resolved. 

Likewise, `comments` and `likes`  depend on the resolved value of the `page` operation, so they will await that resolution and then fire concurrently.

The operations above are written in order for clarity, but this is not required (as objects have no concept of "order" anyway).

## Kickstart with arguments

Your Sortasync instance can be reused, and you may want to pass it arguments in order to kickstart the sequence. You can use the special `_args` key to name these arguments ahead of time, then inject them as usual.


```javascript
var mySequence = new Sortasync({
  _args: [ 'userId', 'accessToken' ],
  user: function(userId, accessToken) {
    return someApi.getUser(userId, accessToken);
  }
});

mySequence
  .exec(123, VERY_SECURE_TOKEN)
  .then(...)
```

## Rejections and exceptions

Under the hood Sortasync constructs one unbroken chain of promises using Promise.all, so a rejection or error at any step of the process will travel down the chain and result in a rejection of the final returned promise. 

If a promise was "intentionally rejected" (rejected with a value that is not an instance of Error), Sortasync will normalize the rejection as an Error object with the name `RejectionError`. If the rejection value is a string, that string will be used as the error's message. If the rejection arises from an exception, Sortasync will pass on the original Error. 

In both cases, Sortasync will decorate the Error object with a `sortasync` key that contains additional data about the rejection. 

Intentional rejection:

```javascript
var mySequence = new Sortasync({
  wontWork: function() {
    return Promise.reject('Computer says no');
  }
});

mySequence
  .exec()
  .catch(function(err) {
    err instanceof Error; // true
    err.name;             // 'RejectionError'
    err.message;          // 'Computer says no' (rejection value if string, otherwise '')
    err.sortasync.step;   // 'wontWork'
    err.sortasync.reason; // 'Computer says no' (rejection value regardless of type)
  }));
```

Exceptional rejection:

```javascript
var mySequence = new Sortasync({
  wontWork: function() {
    return someUndefinedFunction();
  }
});

mySequence
  .exec()
  .catch(function(err) {
    err instanceof Error; // true
    err.name;             // 'ReferenceError'
    err.message           // 'someUndefinedFunction is not defined'
    err.sortasync.step;   // 'wontWork'
    err.sortasync.reason; // null
  }));
```

## Customize rejection behavior

If you'd like to customize how rejections and exceptions are handled, just replace `normalizeRejection` on the prototype. 

This code runs in a catch block attached to each individual step in the Sortasync sequence (so as to capture the offending step), so if you want the rejection to cascade to the final promise, be sure to re-emit a rejection or error of some kind. Not doing so will effectively "squash" the error and the key will resolve to `undefined` in the final payload. 

```javascript
Sortasync.prototype.normalizeRejection = function(rejectionValue, stepName) {
  if (typeof rejectionValue === 'string') {
    var cameFromAbove = rejectionValue.match(/^Something went wrong at (.*)$/);
    stepName = cameFromAbove ? cameFromAbove[1] : stepName;
  }
  return Promise.reject("Something went wrong at " + stepName);
}
```

## Explicit dependency injection

Sortasync supports explicit dependency injection for code that will be minified. 

```javascript
var mySequence = new Sortasync({
  _args: [ 'arg1', 'arg2' ],
  firstCall: [ function() {
    return someApi.doSomething();
  }],
  secondCall: [ 'firstCall', function(firstCall) {
    return someApi.doSomethingWith(firstCall);
  }]
});
```

## Builds

The final distributed library comes in three flavors:

**sortasync&#46;bundle&#46;js**

Sortasync for CommonJS, AMD, and the browser (global `Sortasync`) bundled with the Babel Runtime Transform. This plug-and-play version includes polyfills for Promise and Map without polluting your global namespace. This is the version you'll receive when you `require('sortasync')`. 9kb minified and gzipped. 

**sortasync&#46;compat&#46;js**

Sortasync for CommonJS, AMD, and the browser with ES2015 language features replaced but Promise and Map intact. Legacy environments will require a [polyfill](https://babeljs.io/docs/usage/polyfill/) for these. 1kb minified and gzipped.

**sortasync&#46;es2015&#46;js**

Sortasync au naturel: CommonJS, ES2015. Use with Node 6+. 1kb gzipped.

## About Classy

Classy is a technology company that helps organizations mobilize their community to solve social problems more effectively and efficiently. Since launching in 2011, Classy has helped more than 2,500 social enterprises including Oxfam, The World Food Programme and National Geographic to raise hundreds of millions of dollars. Classy also hosts the Collaborative and Classy Awards to recognize excellence in social innovation. Based in San Diego, CA, Classy employs a staff of 165 people and is backed by investors including Mithril and Salesforce Ventures.

Learn more: https://www.classy.org

And, we're hiring: http://www.classy.org/careers
