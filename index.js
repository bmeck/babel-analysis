
const src = require('fs').readFileSync(process.argv[2]).toString();

const ast = require('babylon').parse(src, {
  sourceFilename: 'tempfile'
});
const t = require('babel-types');
const traverse = require('babel-traverse').default
const Scope = require('babel-traverse').Scope;
const {Step} = require('./step/Step');
const {
  Block,
  NormalCompletion,
  MarkerCompletion,
  BranchCompletion,
  BreakCompletion,
  ContinueCompletion,
} = require('./block/Block');
const CFGBuilder = require('./CFGBuilder');
const makeBlock = (path, loc = 'start', prefix = '') => {
  const block = new Block;
  block.name = `${prefix}${path.node.loc.filename || ''}#${path.node.loc[loc].line}:${path.node.loc[loc].column}`;
  return block;
}
const builder = new CFGBuilder(
  Object.assign(new Block, {name: 'root'}),
  Object.assign(new Block, {name: 'end'})
);
const subtraversal = (path) => {
  traverse(
    t.file(
    Object.assign(t.program([
      path.isStatement() ?
        path.node :
        Object.assign(t.expressionStatement(path.node), {loc:path.node.loc})
    ]), {loc:path.node.loc})
    ),
    handlers,
    path.scope,
    path.state,
    path
  );
}
const BLOCK_STACK = [];
const handlers = {
  Program(path) {builder.setHandled(path);},
  LabeledStatement: {
    enter(path) {
      path.skipKey('label');
    }
  },
  'DoWhileStatement|WhileStatement': {
    enter(path) {
      path.skipKey('test');
      path.skipKey('body');
      const whileBlock = builder.currentBlock;
      const testBlock = makeBlock(path, 'start', 'while_test_');
      const test = path.get('test');
      const whileBodyBlock = makeBlock(test, 'end', 'while_body_');
      const joinBlock = makeBlock(path, 'end', 'while_join_');
      const firstBlock = path.isWhileStatement() ? testBlock : whileBodyBlock;
      whileBlock.setCompletion(new MarkerCompletion(whileBlock, firstBlock));
      builder.currentBlock = testBlock;
      subtraversal(test);
      const testJoinBlock = builder.currentBlock;
      testJoinBlock.setCompletion(new BranchCompletion(testJoinBlock, whileBodyBlock, joinBlock));
      if (path.parentPath.isLabeledStatement()) {
        builder.setHandled(path.parentPath);
        const name = path.parent.label.name;
        builder.setLabel(name, path.node, whileBlock.completion);
      }
      builder.setLoop(path, {
        enter: testBlock,
        exit: joinBlock,
      });
      builder.currentBlock = whileBodyBlock;
      subtraversal(path.get('body'));
      const bodyJoinBlock = builder.currentBlock;
      bodyJoinBlock.setCompletion(new NormalCompletion(bodyJoinBlock, testBlock));
      builder.setHandled(path);
      builder.currentBlock = joinBlock;
    }
  },
  IfStatement: {
    enter(path) {
      // YOLO
      subtraversal(path.get('test'));
      path.skipKey('test');
      const consequent = path.get('consequent');
      const alternate = path.node.alternate ? path.get('alternate') : null;
      const consequentBlock = makeBlock(consequent, 'start', 'truthy_');
      const forkBlock = builder.currentBlock;
      builder.currentBlock = consequentBlock;
      subtraversal(consequent);
      path.skipKey('consequent');
      // always join from Block
      const join = builder.currentBlock;
      if (alternate) {
        const alternateBlock = makeBlock(alternate, 'end', 'falsey_');
        builder.currentBlock = alternateBlock;
        subtraversal(alternate);
        path.skipKey('alternate');
        // always NormalCompletion
        const alternateJoinBlock = builder.currentBlock;
        alternateJoinBlock.setCompletion(new NormalCompletion(alternateJoinBlock, join));
        forkBlock.setCompletion(new BranchCompletion(forkBlock, consequentBlock, alternateBlock));
        builder.currentBlock = join;
      }
      else {
        forkBlock.setCompletion(new BranchCompletion(forkBlock, consequentBlock, join));
        builder.currentBlock = join;
      }
      builder.setHandled(path);
      builder.currentBlock = join;
    }
  },
  'EmptyStatement|DebuggerStatement': {
    enter(path) {
      builder.setHandled(path);
    },
  },
  BlockStatement: {
    enter(path) {
      builder.setHandled(path);
      const bodyBlock = makeBlock(path, 'start');
      const joinBlock = makeBlock(path, 'end');
      BLOCK_STACK.push({exit: joinBlock});
      if (path.parentPath.isLabeledStatement()) {
        builder.setHandled(path.parentPath);
        const name = path.parent.label.name;
        const completion = {exit: joinBlock};
        builder.setLabel(name, path.node, completion);
        const labelBlock = builder.currentBlock;
        labelBlock.setCompletion(new MarkerCompletion(labelBlock, bodyBlock));
        builder.currentBlock = bodyBlock;
      }
    },
    exit(path) {
      const {exit} = BLOCK_STACK.pop();
      const bodyBlock = builder.currentBlock;
      bodyBlock.setCompletion(new NormalCompletion(bodyBlock, exit));
      builder.currentBlock = exit;
    }
  },
  ExpressionStatement: {
    enter(path) {
      builder.setHandled(path);
    }
  },
  'NumericLiteral|BooleanLiteral|StringLiteral': {
    exit(path) {
      const constant = builder.getConstant(typeof path.node.value, path.node.value);
      builder.currentBlock.steps.push(constant);
    }
  },
  'NullLiteral': {
    exit(path) {
      const constant = builder.getConstant('null', null);
      builder.currentBlock.steps.push(constant);
    }
  },
  'Identifier': {
    exit(path) {
      builder.currentBlock.steps.push(new Step(`Identifier#${path.node.name}`));
    }
  },
  UnaryExpression: {
    enter(path) {
      path.skipKey('argument');
      builder.setHandled(path);
      const argument = path.get('argument');
      builder.setHandled(argument);
      subtraversal(argument);
      const exprBlock = builder.currentBlock;
      const valueStep = exprBlock.steps[exprBlock.steps.length -1];
      builder.currentBlock.steps.push(new Step(
        path.node.operator, [valueStep]
      ));
    }
  },
  BinaryExpression: {
    enter(path) {
      path.skipKey('left');
      path.skipKey('right');
      builder.setHandled(path);
      const left = path.get('left');
      builder.setHandled(left);
      subtraversal(left);
      const leftBlock = builder.currentBlock;
      const leftValueStep = leftBlock.steps[leftBlock.steps.length -1];
      const right = path.get('right');
      builder.setHandled(right);
      subtraversal(right);
      const rightBlock = builder.currentBlock;
      const rightValueStep = rightBlock.steps[rightBlock.steps.length -1];
      builder.currentBlock.steps.push(new Step(
        path.node.operator, [leftValueStep, rightValueStep]
      ));
    }
  },
  MemberExpression: {
    enter(path) {
      path.skipKey('object');
      path.skipKey('property');
      builder.setHandled(path);
      const left = path.get('object');
      builder.setHandled(left);
      subtraversal(left);
      const leftBlock = builder.currentBlock;
      const leftValueStep = leftBlock.steps[leftBlock.steps.length -1];
      const right = path.get('property');
      builder.setHandled(right);
      subtraversal(right);
      const rightBlock = builder.currentBlock;
      const rightValueStep = rightBlock.steps[rightBlock.steps.length -1];
      builder.currentBlock.steps.push(new Step(
        path.node.computed ? '[ ]' : '.', [leftValueStep, rightValueStep]
      ));
    }
  },
  BreakStatement(path) {
    builder.setHandled(path);
    let next;
    if (path.node.label !== null) {
      path.skipKey('label');
      const name = path.node.label.name;
      const completion = builder.getLabelCompletion(name);
      if (!completion) {
        throw `unknown label ${name}`;
      }
      next = completion.exit;
    }
    else {
      const completion = builder.getParentLoopCompletion(path);
      if (!completion) {
        throw `not in a loop`;
      }
      next = completion.exit;
    }
    const bodyBlock = builder.currentBlock;
    bodyBlock.setCompletion(new BreakCompletion(bodyBlock, next));
    // unreachable
    const unreachable = makeBlock(path, 'end', 'unreachable_');
    builder.addUnreachable(builder.currentBlock, unreachable);
    builder.currentBlock = unreachable;
  },
  ContinueStatement(path) {
    builder.setHandled(path);
    let next;
    if (path.node.label !== null) {
      path.skipKey('label');
      const name = path.node.label.name;
      const completion = builder.getLabelCompletion(name);
      if (!completion) {
        throw `unknown label ${name}`;
      }
      next = completion.enter;
    }
    else {
      const completion = builder.getParentLoopCompletion(path);
      if (!completion) {
        throw `not in a loop`;
      }
      next = completion.enter;
    }
    const bodyBlock = builder.currentBlock;
    bodyBlock.setCompletion(new ContinueCompletion(bodyBlock, next));
    // unreachable
    const unreachable = makeBlock(path, 'end', 'unreachable_');
    builder.addUnreachable(builder.currentBlock, unreachable);
    builder.currentBlock = unreachable;
  },
  enter(path) {
    // console.log('enter', path.node.type)
  },
  exit(path) {
    builder.setUnhandled(path);
    builder.disposePath(path);
  },
}
setup_root: {
  const entryBlock = makeBlock({node: ast});
  const programBlock = builder.currentBlock;
  programBlock.setCompletion(
    new MarkerCompletion(programBlock, entryBlock)
  );
  builder.currentBlock = entryBlock;
  builder.setHandled({node: ast});
}
traverse(ast, handlers);
setup_exit: {
  const programJoinBlock = builder.currentBlock;
  programJoinBlock.setCompletion(
    new NormalCompletion(programJoinBlock, builder.exit)
  );
}

require('./printer/DOT').dump(builder);
