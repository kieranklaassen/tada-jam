"use strict";
(() => {
  // src/core/load-mark.ts
  var LOAD_CELL_BUSY = 0;
  var LOAD_CELL_RUN = 1;
  var LOAD_CELL_NAP = 2;

  // src/core/load-sampler.worker.ts
  var NAP_MIN_MS = 0.8;
  var NAP_SPREAD_MS = 1.6;
  var scope = globalThis;
  scope.onmessage = (event) => {
    const { buffer, run, slots, reportMs } = event.data;
    const cells = new Int32Array(buffer);
    let counts = new Uint32Array(slots);
    let total = 0;
    let reported = performance.now();
    while (Atomics.load(cells, LOAD_CELL_RUN) === run) {
      Atomics.wait(cells, LOAD_CELL_NAP, 0, NAP_MIN_MS + Math.random() * NAP_SPREAD_MS);
      const busy = Atomics.load(cells, LOAD_CELL_BUSY);
      if (busy > 0 && busy < slots) counts[busy] += 1;
      total += 1;
      const now = performance.now();
      if (now - reported < reportMs) continue;
      scope.postMessage({ counts, total });
      counts = new Uint32Array(slots);
      total = 0;
      reported = now;
    }
    scope.close();
  };
})();
