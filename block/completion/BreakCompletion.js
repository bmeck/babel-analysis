//@flow
'use strict';
/*:: var Block = require('../Block').Block; */
// This represents a break point jumping to a different block.
// 
// For example:
//
// block: {
//   break block;
// } <- location of .join
//
// Creation of these generally is coupled with some form of a join.
//
class BreakCompletion {
  /*::
    type: string;
    origin: Block;
    join: Block;
  */
  constructor(origin/*: Block*/, join/*: Block*/) {
    this.origin = origin;
    this.join = join;
  }
}
exports.BreakCompletion = BreakCompletion;