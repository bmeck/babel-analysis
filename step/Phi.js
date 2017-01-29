
'use strict';
/*:: var {Step} = require('./Step'); */
class Phi {
  /*::
    args: [(Block,Step_index)];
  */
  constructor(args/*: Step[]*/) {
    this.args = [...args];
  }
}
exports.Phi = Phi;
