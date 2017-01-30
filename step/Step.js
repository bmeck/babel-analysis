//@flow
'use strict';
class Step {
  /*::
    name: string;
    consumers: Set<Step>;
  */
  constructor(name/*: string*/) {
    this.name = name;
    this.consumers = new Set();
  }
}
exports.Step = Step;
