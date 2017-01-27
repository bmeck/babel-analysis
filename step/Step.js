//@flow
'use strict';
class Step {
  /*::
    name: string;
    args: Step[];
    consumers: Set<Step>;
  */
  constructor(name/*: string*/, args/*: Step[]*/) {
    this.name = name;
    this.args = [...args];
    this.consumers = new Set();
  }
}
exports.Step = Step;
