# koa-mount

  Mount other Koa applications as middleware. The `path` passed to `mount()` is stripped
  from the URL temporarily until the stack unwinds. This is useful for creating entire
  apps or middleware that will function correctly regardless of which path segment(s)
  they should operate on.

## Installation

```js
$ npm install @smartmiting/koa-mount
```

## Examples

  View the [./examples](examples) directory for working examples.

### Mounting Applications

  Entire applications mounted at specific paths. For example you could mount
  a blog application at "/blog", with a router that matches paths such as
  "GET /", "GET /posts", and will behave properly for "GET /blog/posts" etc
  when mounted.

```js
const mount = require('@smartmiting/koa-mount');
const Koa = require('koa');

// hello

const a = new Koa();

a.use(async function (ctx, next){
  await next();
  ctx.body = 'Hello';
});

// world

const b = new Koa();

b.use(async function (ctx, next){
  await next();
  ctx.body = 'World';
});

// app

const app = new Koa();

app.use(mount('/hello', a));
app.use(mount('/world', b));

app.listen(3000);
console.log('listening on port 3000');
```

  Try the following requests:

```
$ GET /
Not Found

$ GET /hello
Hello

$ GET /world
World
```

### Mounting Middleware

  Mount middleware at specific paths, allowing them to operate independently
  of the prefix, as they're not aware of it.

```js
const mount = require('@smartmiting/koa-mount');
const Koa = require('koa');

async function hello(ctx, next){
  await next();
  ctx.body = 'Hello';
}

async function world(ctx, next){
  await next();
  ctx.body = 'World';
}

const app = new Koa();

app.use(mount('/hello', hello));
app.use(mount('/world', world));

app.listen(3000);
console.log('listening on port 3000');
```

### Optional Paths

  The path argument is optional, defaulting to "/":

```js
app.use(mount(a));
app.use(mount(b));
```

### Optional Config

  option parameter is optional.
  * `preserve` node is the switch to preserve each app instance, default is false
     
     when `preserve` is true, it can solve the problem:
     
     - [mounted app.keys ignored](https://github.com/koajs/mount/issues/29)
     - [https://github.com/koajs/koa/issues/203](https://github.com/koajs/koa/issues/203#issuecomment-47097294)
     - [support to preserve app context on mounted Koa app](https://github.com/koajs/mount/pull/58)
  
```js
app.use(mount('/api', apiInstance, {preserve: true}));
```

## Todos

1. set default cookie path for preserved koa app
2. <del>preserve the mounted app context which without mount path('/') </del> [2017-09-03]

## Debugging

  Use the __DEBUG__ environement variable to whitelist
  koa-mount debug output:

```
$ DEBUG=koa-mount node myapp.js &
$ GET /foo/bar/baz

  koa-mount enter /foo/bar/baz -> /bar/baz +2s
  koa-mount enter /bar/baz -> /baz +0ms
  koa-mount enter /baz -> / +0ms
  koa-mount leave /baz -> / +1ms
  koa-mount leave /bar/baz -> /baz +0ms
  koa-mount leave /foo/bar/baz -> /bar/baz +0ms
```

## License

  MIT
