//@flow
'use strict';
/*:: var Block = require('../block/Block').Block; */
const {
  NormalCompletion,
  MarkerCompletion,
  BranchCompletion,
  BreakCompletion,
  ContinueCompletion,
} = require('../Block/block');

exports.dump = (builder) => {
  const visited/*: WeakSet<Block>*/ = new WeakSet;
  const traverse = (block) => {
    if (visited.has(block)) {
      return;
    }
    visited.add(block);
    // TODO: use Step class / tiling
    let rows = [block.name, ...Array.from(block.steps.values()).map(x => x.dump)];
    console.log(`${block.name} [label="{${rows.join('|')}}"]`);
    const completion = block.completion;
    // end of graph
    if (!completion) {
      if (block !== builder.exit) {
        throw 'Unexpected exit from graph';
      }
      return;
    }
    if (completion instanceof BranchCompletion) {
      console.log(`${block.name} -> ${completion.consequent.name} [label=truthy]`);
      traverse(completion.consequent);
      console.log(`${block.name} -> ${completion.alternate.name} [label=falsey]`);
      traverse(completion.alternate);
    }
    else if (completion instanceof BreakCompletion) {
      console.log(`${block.name} -> ${completion.join.name} [label=break]`);
      traverse(completion.join);
    }
    else if (completion instanceof ContinueCompletion) {
      console.log(`${block.name} -> ${completion.join.name} [label=continue]`);
      traverse(completion.join);
    }
    else if (completion instanceof MarkerCompletion) {
      console.log(`${block.name} -> ${completion.next.name} [label=mark]`);
      traverse(completion.next);
    }
    else if (completion instanceof NormalCompletion) {
      console.log(`${block.name} -> ${completion.join.name} [label=normal]`);
      traverse(completion.join);
    }
    else {
      throw 'unknown completion : ' + completion.constructor.name;
    }
  }
  console.log('digraph {');
  console.log('node [shape=record]');
  if (builder.unhandled.size) {
    for (const unhandled of builder.unhandled) {
      console.log(`// unhandled ${unhandled.type} ${JSON.stringify(unhandled.loc.start)}`);
    }
  }
  traverse(builder.root);
  for (let [origin, unreachable] of builder.unreachable) {
    console.log(
      `${origin.name} -> ${unreachable.name} [label=unreachable,style=dotted]`
    )
    traverse(unreachable);
  }
  console.log('}');
};
