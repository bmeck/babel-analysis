//@flow
'use strict';
/*:: var Block = require('../Block').Block; */
// This represents an implicit control flow.
// 
// For example, the end of a BlockStatement ala:
//
// block: {
// } <- location of .join
//
class NormalCompletion {
  /*::
    type: string;
    origin: Block;
    join: Block | null;
  */
  constructor(origin/*: Block*/, join/*: Block*/) {
    this.origin = origin;
    this.join = join;
  }
}
exports.NormalCompletion = NormalCompletion;