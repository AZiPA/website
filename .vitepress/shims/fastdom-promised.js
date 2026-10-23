// ESM stand-in for `fastdom/extensions/fastdom-promised.js` (also CJS-only).
function create(promised, type, fn, ctx) {
  const tasks = promised._tasks;
  const fastdom = promised.fastdom;
  let task;
  const promise = new Promise((resolve, reject) => {
    task = fastdom[type](function runTask() {
      tasks.delete(promise);
      try {
        resolve(ctx ? fn.call(ctx) : fn());
      } catch (error) {
        reject(error);
      }
    }, ctx);
  });
  tasks.set(promise, task);
  return promise;
}

export default {
  initialize() {
    this._tasks = new Map();
  },
  mutate(fn, ctx) {
    return create(this, "mutate", fn, ctx);
  },
  measure(fn, ctx) {
    return create(this, "measure", fn, ctx);
  },
  clear(promise) {
    const task = this._tasks.get(promise);
    this.fastdom.clear(task);
    this._tasks.delete(promise);
  },
};
