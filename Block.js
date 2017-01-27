// @flow
'use strict';
/*::
  type COMPLETION = 
    | BlockCompletion
    | NormalCompletion
    | BreakCompletion
    ;
  *//*
  TODO
    
    // To invoker, closure dying
    | {type: 'RETURN'}
    
    // To invoker, closure paused
    | {type: 'YIELD'}
    
    // To invoker, closure paused
    | {type: 'AWAIT'}
    
    // Always goes to guard
    | {type: 'THROW'}

    // Guard
    | {type: 'TRY', try: Block, catch: Block, finally: Block} 
    ;
*/
class Block {
  /*::
    name: string;
    phis: Map<string, Object>;
    steps: Set<Step>;
    completion: COMPLETION | null;
    abrupt: Block | null;
  */
  constructor() {
    this.name = "";
    this.steps = new Set;
    this.completion = null;
  }

  // Should dump node and connections to DOT format. This is for debugging.
  //
  // https://en.wikipedia.org/wiki/DOT_(graph_description_language)
  dump(visited = new WeakSet) {
    if (visited.has(this)) {
      return;
    }
    visited.add(this);
    let rows = [this.name];
    rows = rows.concat([...this.steps].map(x => x.dump));
    console.log(`${this.name} [label="{${rows.join('|')}}"]`)
    if (this.completion) this.completion.dump(this, visited);
  }
}
exports.Block = Block;

class Scope {
  constructor(root = new Block) {
    this.bindings = new Map();
    this.root = root;
  }
}

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
    join: Block | null;
  */
  constructor(join/*: Block*/) {
    this.type = 'NORMAL';
    this.join = join;
  }
  dump(origin, visited) {
    console.log(`${origin.name} -> ${this.join.name} [label=normal]`);
    this.join.dump(visited);
  }
}
exports.NormalCompletion = NormalCompletion;

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
    next: Block;
  */
  constructor(next/*: Block*/) {
    this.type = 'MARKER';
    this.next = next;
  }
  dump(origin, visited) {
    console.log(`${origin.name} -> ${this.next.name} [label=mark]`);
    this.next.dump(visited);
  }
}
exports.MarkerCompletion = MarkerCompletion;

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
    join: Block;
  */
  constructor(join/*: Block*/) {
    this.type = 'BREAK';
    this.join = join;
  }
  dump(origin, visited) {
    console.log(`${origin.name} -> ${this.join.name} [label=break]`);
    this.join.dump(visited);
  }
}
exports.BreakCompletion = BreakCompletion;

class ContinueCompletion {
  /*::
    type: string;
    join: Block;
  */
  constructor(join/*: Block*/) {
    this.type = 'BREAK';
    this.join = join;
  }
  dump(origin, visited) {
    console.log(`${origin.name} -> ${this.join.name} [label=continue]`);
    this.join.dump(visited);
  }
}
exports.ContinueCompletion = ContinueCompletion;

// This represents a jump based upon the last value of the block.
// 
// For example:
//
// if (1) { <- location of .consequent
// }
// else { <- location of .alternate
// }
//
// Creation of these generally is coupled with some form of a join.
//
class BranchCompletion {
  /*::
    type: string;
    consequent: Block;
    alternate: Block;
  */
  constructor(consequent/*: Block*/,alternate/*: Block*/) {
    this.type = 'BRANCH';
    this.consequent = consequent;
    this.alternate = alternate;
  }
  dump(origin, visited) {
    console.log(`${origin.name} -> ${this.consequent.name} [label=truthy]`);
    this.consequent.dump(visited);
    console.log(`${origin.name} -> ${this.alternate.name} [label=falsey]`);
    this.alternate.dump(visited);
  }
}
exports.BranchCompletion = BranchCompletion;
