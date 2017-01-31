//@flow
'use strict';
/*::
  const {VariablePool} = require('./VariablePool');
  const {Step} = require('../step/Step');
*/
class Binding {
  /*::
    scope: VariablePool;
    declaration: Step;
    references: Step[];
    assignments: Step[];
  */
  constructor(scope/*: VariablePool*/, decl/*: Step*/) {
    this.scope = scope;
    this.declaration = decl;
    this.references = [];
    this.assignments = [];
  }
};
exports.Binding = Binding;
