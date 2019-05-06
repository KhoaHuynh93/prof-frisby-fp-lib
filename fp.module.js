let compose = (...fns) => (...args) => fns.reduceRight((res, fn) => [fn.call(null, ...res)], args)[0];
let curry = (fn) => { const arity = fn.length; return function _curry(...args) { if (args.length < arity) { return _curry.bind(null, ...args); } return fn.call(null, ...args); }; };
let always = curry((a, _b) => a);
let add = curry((a, b) => a + b);
let mult = curry((a, b) => a * b);
let concat = curry((a, b) => a.concat(b));
let eq = curry((a, b) => a === b);
let filter = curry((fn, xs) => xs.filter(fn));
let flip = curry((fn, a, b) => fn(b, a));
let forEach = curry((fn, xs) => xs.forEach(fn));
let head = xs => xs[0];
let intercalate = curry((str, xs) => xs.join(str));
let map = curry((fn, f) => f.map(fn));
let match = curry((re, str) => re.test(str));
let prop = curry((p, obj) => obj[p]);
let reduce = curry((fn, zero, xs) => xs.reduce(fn, zero));
let replace = curry((re, rpl, str) => str.replace(re, rpl));
let reverse = x => Array.isArray(x) ? x.reverse() : x.split('').reverse().join('');
let sortBy = curry((fn, xs) => { return xs.sort((a, b) => { if (fn(a) === fn(b)) { return 0; } return fn(a) > fn(b) ? 1 : -1; }); });
let split = curry((sep, str) => str.split(sep));
let take = curry((n, xs) => xs.slice(0, n));
let toLowerCase = s => s.toLowerCase();
let toString = String;
let toUpperCase = s => s.toUpperCase();
let identity = x => x;

class Identity {
  constructor (x) { this.$value = x; }
  inspect () { return `Identity(${inspect(this.$value)})`; }
  static of (x) { return new Identity(x); }
  map(fn) { return Identity.of(fn(this.$value)); }
  ap (f) { return f.map(this.$value); }
  chain (fn) { return this.map(fn).join(); }
  join () { return this.$value; }
  sequence (of) { return this.traverse(of, identity); }
  traverse (of, fn) { return fn(this.$value).map(Identity.of); }
}
class Maybe {
  get isNothing () { return this.$value === null || this.$value === undefined; }
  get isJust () { return !this.isNothing; }
  constructor (x) { this.$value = x; }
  inspect () { return `Maybe(${inspect(this.$value)})`; }
  static of (x) { return new Maybe(x); }
  map (fn) { return this.isNothing ? this : Maybe.of(fn(this.$value)); }
  ap (f) { return this.isNothing ? this : f.map(this.$value); }
  chain (fn) { return this.map(fn).join(); }
  join () { return this.isNothing ? this : this.$value; }
  sequence (of) { this.traverse(of, identity); }
  traverse (of, fn) { return this.isNothing ? of(this) : fn(this.$value).map(Maybe.of); }
}
class Either {
  constructor (x) { this.$value = x; }
  static of (x) { return new Right(x); }
}
class Left extends Either {
  get isLeft () { return true; }
  get isRight () { return false; }
  static of (x) { throw new Error('`of` called on class Left (value) instead of Either (type)'); }
  inspect () { return `Left(${inspect(this.$value)})`; }
  map () { return this; }
  ap () { return this; }
  chain () { return this; }
  join () { return this; }
  sequence (of) { return of(this); }
  traverse (of, fn) { return of(this); }
}
class Right extends Either {
  get isLeft () { return false; }
  get isRight () { return true; }
  static of (x) { throw new Error('`of` called on class Right (value) instead of Either (type)'); }
  inspect () { return `Right(${inspect(this.$value)})`; }
  map (fn) { return Either.of(fn(this.$value)); }
  ap (f) { return f.map(this.$value); }
  chain (fn) { return fn(this.$value); }
  join () { return this.$value; }
  sequence (of) { return this.traverse(of, identity); }
  traverse (of, fn) { fn(this.$value).map(Either.of); }
}
class IO {
  constructor (fn) { this.unsafePerformIO = fn; }
  inspect () { return `IO(?)`; }
  static of (x) { return new IO(() => x); }
  map (fn) { return new IO(compose(fn, this.unsafePerformIO)); }
  ap (f) { return this.chain(fn => f.map(fn)); }
  chain (fn) { return this.map(fn).join(); }
  join () { return this.unsafePerformIO(); }
}
class List {
  constructor (xs) { this.$value = xs; }
  inspect () { return `List(${inspect(this.$value)})`; }
  concat (x) { return new List(this.$value.concat(x)); }
  static of (x) { return new List([x]); }
  map (fn) { return new List(this.$value.map(fn)); }
  sequence (of) { return this.traverse(of, identity); }
  traverse (of, fn) { return this.$value.reduce((f, a) => fn(a).map(b => bs => bs.concat(b)).ap(f), of(new List([])),);}
}
class Map {
  constructor (x) { this.$value = x; }
  inspect () { return `Map(${inspect(this.$value)})`; }
  insert (k, v) { const singleton = {}; singleton[k] = v; return Map.of(Object.assign({}, this.$value, singleton)); }
  reduceWithKeys (fn, zero) { return Object.keys(this.$value).reduce((acc, k) => fn(acc, this.$value[k], k), zero); }
  map (fn) { return this.reduceWithKeys( (m, v, k) => m.insert(k, fn(v)), new Map({}), ); }
  sequence (of) { return this.traverse(of, identity); }
  traverse (of, fn) { return this.reduceWithKeys((f, a, k) => fn(a).map(b => m => m.insert(k, b)).ap(f), of(new Map({})),);}
}
class Task {
  constructor (fork) { this.fork = fork; }
  inspect () { return 'Task(?)'; }
  static rejected (x) { return new Task((reject, _) => reject(x)); }
  static of (x) { return new Task((_, resolve) => resolve(x)); }
  map (fn) { return new Task((reject, resolve) => this.fork(reject, compose(resolve, fn))); }
  ap (f) { return this.chain(fn => f.map(fn)); }
  chain (fn) { return new Task((reject, resolve) => this.fork(reject, x => fn(x).fork(reject, resolve))); }
  join () { return this.chain(identity); }
}

let chain = curry((fn, m) => m.chain(fn));
let join = m => m.join();
let last = xs => xs[xs.length - 1];
let lineMap = compose(map, compose);
let safeHead = compose(Maybe.of, head);
let safeLast = compose(Maybe.of, last);
let safeProp = curry((p, obj) => compose(Maybe.of, prop(p))(obj));
let sequence = curry((of, f) => f.sequence(of));
let traverse = curry((of, fn, f) => f.traverse(of, fn));
let unsafePerformIO = io => io.unsafePerformIO();
let either = curry((f, g, e) => { if (e.isLeft) { return f(e.$value); } return g(e.$value); });
let inspect = (x) => { if (x && typeof x.inspect === 'function') { return x.inspect(); } function inspectFn(f) { return f.name ? f.name : f.toString(); } function inspectTerm(t) { switch (typeof t) { case 'string': return `'${t}'`; case 'object': { const ts = Object.keys(t).map(k => [k, inspect(t[k])]); return `{${ts.map(kv => kv.join(': ')).join(', ')}}`; } default: return String(t); } } function inspectArgs(args) { return Array.isArray(args) ? `[${args.map(inspect).join(', ')}]` : inspectTerm(args); } return (typeof x === 'function') ? inspectFn(x) : inspectArgs(x); };
let left = a => new Left(a);
let liftA2 = curry((fn, a1, a2) => a1.map(fn).ap(a2));
let liftA3 = curry((fn, a1, a2, a3) => a1.map(fn).ap(a2).ap(a3));
let maybe = curry((v, f, m) => { if (m.isNothing) { return v; } return f(m.$value); });
let nothing = () => Maybe.of(null);
let reject = a => Task.rejected(a);
let createCompose = curry((F, G) => class Compose {
  constructor(x) { this.$value = x; }
  inspect() { return `Compose(${inspect(this.$value)})`;}
  static of(x) { return new Compose(F(G(x)));}
  map(fn) { return new Compose(this.$value.map(x => x.map(fn)));}
  ap(f) {return f.map(this.$value);}}
);

// module.exports = {
//   compose,
//   curry,
//   always,
//   add,
//   mult,
//   concat,
//   eq,
//   filter,
//   flip,
//   forEach,
//   head,
//   intercalate,
//   map,
//   match,
//   prop,
//   reduce,
//   replace,
//   reverse,
//   sortBy,
//   split,
//   take,
//   toLowerCase,
//   toString,
//   toUpperCase,
//   identity,
//   chain,
//   join,
//   last,
//   lineMap,
//   safeHead,
//   safeLast,
//   safeProp,
//   sequence,
//   traverse,
//   unsafePerformIO,
//   either,
//   inspect,
//   left,
//   liftA2,
//   liftA3,
//   maybe,
//   nothing,
//   reject,
//   createCompose,
//   Identity,
//   Maybe,
//   Either,
//   Left,
//   Right,
//   IO,
//   List,
//   Map,
//   Task
// }