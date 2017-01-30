//@flow
'use strict';
const {Step} = require('./Step');
class Stub extends Step {
  /*::
    args: [Step];
  */
  constructor(name/*: string*/, args/*: Step[]*/ = []) {
    super(`%${name}`);
    this.args = [...args];
  }
}
exports.Stub = Stub;
