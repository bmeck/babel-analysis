//@flow
'use strict';
/*::
  const {VariablePool} = require('../../pool/VariablePool');
*/
const {Step} = require('../Step');
class Variable extends Step {
  /*::
    scope: VariablePool;
    id: string;
  */
  constructor(scope/*: VariablePool*/, id/*: string */) {
    super(`ref`);
    this.scope = scope;
    this.id = id;
  }
}
exports.Variable = Variable;
