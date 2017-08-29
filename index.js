
/**
 * Module dependencies.
 */

const debug = require('debug')('koa-mount')
const compose = require('koa-compose')
const assert = require('assert')

/**
 * This keys will be read from the cxt in the koa app's handleResponse func
 * @type {[string,string,string,string,string]}
 */
//Must keep status before than body, otherwise status will be set to 200
const KEYS_KOA_HANDLE_RESPONSE_FROM_CONTEXT = ['respond', 'status', 'body'];

/**
 * Expose `mount()`.
 */

module.exports = mount

/**
 * Mount `app` with `prefix`, `app`
 * may be a Koa application or
 * middleware function.
 *
 * @param {String|Application|Function} prefix, app, or function
 * @param {Application|Function} [app or function]
 * @param {Object} [option]
 * @return {Function}
 * @api public
 */

function mount(prefix, app, option = {}) {
  if (typeof prefix !== 'string') {
    option = app
    app = prefix
    prefix = '/'
  }

  assert.equal(prefix[0], '/', 'mount path must begin with "/"')

  // compose
  const downstream = app.middleware
    ? compose(app.middleware)
    : app

  // don't need to do mounting here
  if (prefix === '/') return downstream

  const trailingSlash = prefix.slice(-1) === '/'

  const name = app.name || 'unnamed'
  debug('mount %s %s', prefix, name)

  //if option.preserve is valid and app has createContext function
  const preserve = !!option.preserve && app.createContext;

  return async function (ctx, upstream) {
    const prev = ctx.path
    const newPath = match(prev)
    debug('mount %s %s -> %s', prefix, name, newPath)
    if (!newPath) return await upstream()

    let newCtx = ctx;
    if (preserve) {
      newCtx = app.createContext(ctx.req, ctx.res);
    }

    newCtx.mountPath = prefix
    newCtx.path = newPath

    debug('enter %s -> %s', prev, newCtx.path)

    await downstream(newCtx, async () => {
      ctx.path = prev
      smartCopyTo(ctx, newCtx, KEYS_KOA_HANDLE_RESPONSE_FROM_CONTEXT)
      await upstream()
      ctx.path = newPath
      smartCopyTo(newCtx, ctx, KEYS_KOA_HANDLE_RESPONSE_FROM_CONTEXT)
    })

    debug('leave %s -> %s', prev, ctx.path)
    ctx.path = prev
    smartCopyTo(ctx, newCtx, KEYS_KOA_HANDLE_RESPONSE_FROM_CONTEXT)
  }

  /**
   * Check if `prefix` satisfies a `path`.
   * Returns the new path.
   *
   * match('/images/', '/lkajsldkjf') => false
   * match('/images', '/images') => /
   * match('/images/', '/images') => false
   * match('/images/', '/images/asdf') => /asdf
   *
   * @param {String} prefix
   * @param {String} path
   * @return {String|Boolean}
   * @api private
   */

  function match (path) {
    // does not match prefix at all
    if (path.indexOf(prefix) !== 0) return false

    const newPath = path.replace(prefix, '') || '/'
    if (trailingSlash) return newPath

    // `/mount` does not match `/mountlkjalskjdf`
    if (newPath[0] !== '/') return false
    return newPath
  }

  /**
   * smart pick context values between preserved app context and hosted app's context
   * @param to copyTo app context
   * @param from copyFrom app context
   * @param props prop names array which need to copy
   */
  function smartCopyTo(to, from, props){
    //same object, ignore pick
    // if preserve is false, same context don't need to copy
    if(to === from) return to

    //convert props to array
    props = [].concat(props)

    props
      .filter(key => !!key)
      .forEach(key => to[key] = from[key])
  }
}
