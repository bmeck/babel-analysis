//@flow
'use strict';
const {Step} = require('../Step');
class Phi extends Step {
  /*::
    args: [Step];
  */
  constructor(args/*: Step[]*/) {
    super('ϕ');
    this.args = [...args];
    if (this.args.length < 2) {
      throw new Error(`Phi should have 2 or more arguments`);
    }
  }
}
exports.Phi = Phi;
