// ESM stand-in for the CJS `fastdom` package.
// Mermaid imports a default export. Vite serves the published CJS file as ESM
// and the dev server dies on every page (`does not provide an export named default`).
// The queue behavior matches FastDom: one shared read/write batch, extend() inherits it.

function run(host, task) {
  try {
    return task.ctx ? task.fn.call(task.ctx) : task.fn();
  } catch (error) {
    if (typeof host.catch === "function") host.catch(error);
    else throw error;
  }
}

function flush(host) {
  const reads = host.reads.splice(0);
  const writes = host.writes.splice(0);
  host.scheduled = false;
  for (const task of reads) run(host, task);
  for (const task of writes) run(host, task);
  if (host.reads.length || host.writes.length) schedule(host);
}

function schedule(host) {
  if (host.scheduled) return;
  host.scheduled = true;
  host.raf(() => flush(host));
}

function create() {
  return {
    reads: [],
    writes: [],
    scheduled: false,
    catch: null,
    raf(cb) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
      else setTimeout(cb, 16);
    },
    measure(fn, ctx) {
      const task = { fn, ctx };
      this.reads.push(task);
      schedule(this);
      return task;
    },
    mutate(fn, ctx) {
      const task = { fn, ctx };
      this.writes.push(task);
      schedule(this);
      return task;
    },
    clear(task) {
      if (!task) return false;
      const readIndex = this.reads.indexOf(task);
      if (readIndex !== -1) {
        this.reads.splice(readIndex, 1);
        return true;
      }
      const writeIndex = this.writes.indexOf(task);
      if (writeIndex !== -1) {
        this.writes.splice(writeIndex, 1);
        return true;
      }
      return false;
    },
    extend(props) {
      if (props === null || typeof props !== "object") throw new Error("expected object");
      const child = Object.create(this);
      Object.assign(child, props);
      child.fastdom = this;
      if (typeof child.initialize === "function") child.initialize();
      return child;
    },
  };
}

export default create();
