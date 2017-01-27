//@flow
'use strict';
/*:: var Block = require('../Block').Block; */
// This represents a block that has a distinct entry point and exit point.
// 
// For example, the entry/exit of a BlockStatement ala:
//
// while(true) { <- location of entry marker , can be used to break/continue
// }
//
// Creation of these generally is coupled with some form of a join.
//
class MarkerCompletion {
  /*::
    type: string;
    origin: Block;
    next: Block;
  */
  constructor(origin/*: Block*/, next/*: Block*/) {
    this.origin = origin;
    this.next = next;
  }
}
exports.MarkerCompletion = MarkerCompletion;