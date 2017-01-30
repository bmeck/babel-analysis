'use strict';
const src = require('fs').readFileSync(process.argv[2]).toString();

const ast = require('babylon').parse(src, {
  sourceFilename: 'tempfile'
});
const t = require('babel-types');
const traverse = require('babel-traverse').default
const Scope = require('babel-traverse').Scope;
const {Stub} = require('./step/Stub');
const {Phi} = require('./step/ref/Phi');
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
const SCOPE_STACK = [];
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
      const test = path.get('test');
      subtraversal(test);
      path.skipKey('test');
      const consequent = path.get('consequent');
      const alternate = path.node.alternate ? path.get('alternate') : null;
      const consequentBlock = makeBlock(consequent, 'start', 'truthy_');
      const forkBlock = builder.currentBlock;
      builder.setHandled(path);
      builder.setHandled(test);
      builder.setHandled(consequent);
      builder.currentBlock = consequentBlock;
      subtraversal(consequent);
      path.skipKey('consequent');
      // always join from Block
      const join = builder.currentBlock;
      if (alternate) {
        builder.setHandled(alternate);
        const alternateBlock = makeBlock(alternate, 'end', 'falsey_');
        builder.currentBlock = alternateBlock;
        subtraversal(alternate);
        path.skipKey('alternate');
        // always NormalCompletion
        const alternateJoinBlock = builder.currentBlock;
        alternateJoinBlock.setCompletion(new NormalCompletion(alternateJoinBlock, join));
        forkBlock.setCompletion(new BranchCompletion(forkBlock, consequentBlock, alternateBlock));
      }
      else {
        forkBlock.setCompletion(new BranchCompletion(forkBlock, consequentBlock, join));
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
      BLOCK_STACK.push({
        entry: bodyBlock,
        exit: joinBlock,
      });
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
      const {entry, exit} = BLOCK_STACK.pop();
      const bodyJoinBlock = builder.currentBlock;
      if (bodyJoinBlock === entry) {
        bodyJoinBlock.setCompletion(new NormalCompletion(bodyJoinBlock, exit));
        builder.currentBlock = exit;
      }
    }
  },
  ExpressionStatement: {
    enter(path) {
      builder.setHandled(path);
    }
  },
  'NumericLiteral|BooleanLiteral|StringLiteral': {
    exit(path) {
      const constant = builder.getConstant(path.node.value);
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
      builder.currentBlock.steps.push(new Stub(`Identifier#${path.node.name}`));
    }
  },
  ConditionalExpression: {
    enter(path) {
      // YOLO
      path.skipKey('test');
      path.skipKey('consequent');
      path.skipKey('alternate');
      const joinBlock = makeBlock(path, 'end', 'join_');
      const test = path.get('test');
      const consequent = path.get('consequent');
      const alternate = path.get('alternate');
      const consequentBlock = makeBlock(consequent, 'start', 'truthy_');
      const alternateBlock = makeBlock(alternate, 'end', 'falsey_');
      subtraversal(test);
      const forkBlock = builder.currentBlock;
      builder.currentBlock = consequentBlock;
      subtraversal(consequent);
      // always join from Block
      const consequentJoinBlock = builder.currentBlock;
      consequentJoinBlock.setCompletion(new NormalCompletion(consequentJoinBlock, joinBlock));
      builder.currentBlock = alternateBlock;
      subtraversal(alternate);
      // always NormalCompletion
      const alternateJoinBlock = builder.currentBlock;
      alternateJoinBlock.setCompletion(new NormalCompletion(alternateJoinBlock, joinBlock));
      forkBlock.setCompletion(new BranchCompletion(forkBlock, consequentBlock, alternateBlock));
      builder.setHandled(path);
      builder.setHandled(test);
      builder.setHandled(consequent);
      builder.setHandled(alternate);
      builder.currentBlock = joinBlock;
      joinBlock.steps.push(new Phi([
        [consequentBlock, consequentBlock.steps.length - 1],
        [alternateJoinBlock, alternateJoinBlock.steps.length - 1],
      ]))
    }
  },
  LogicalExpression: {
    enter(path) {
      path.skipKey('left');
      path.skipKey('right');
      const left = path.get('left');
      const right = path.get('right');
      builder.setHandled(path);
      builder.setHandled(left);
      builder.setHandled(right);
      const rightBlock = makeBlock(right);
      const joinBlock = makeBlock(path, 'end');
      subtraversal(left);
      const leftJoinBlock = builder.currentBlock;
      if (path.node.operator === '&&') {
        leftJoinBlock.setCompletion(new BranchCompletion(
          leftJoinBlock, rightBlock, joinBlock));
      }
      else if (path.node.operator === '||') {
        leftJoinBlock.setCompletion(new BranchCompletion(
          leftJoinBlock, joinBlock, rightBlock));
      }
      else {
        throw `unknown operator ${path.node.operator}`;
      }
      builder.currentBlock = rightBlock;
      subtraversal(right);
      const rightJoinBlock = builder.currentBlock;
      if (path.node.operator === '&&') {
        rightJoinBlock.setCompletion(new NormalCompletion(
          rightJoinBlock, joinBlock));
      }
      else if (path.node.operator === '||') {
        rightJoinBlock.setCompletion(new NormalCompletion(
          rightJoinBlock, joinBlock));
      }
      else {
        throw `unknown operator ${path.node.operator}`;
      }
      joinBlock.steps.push(new Phi([
        [leftJoinBlock, leftJoinBlock.steps.length - 1],
        [rightJoinBlock, rightJoinBlock.steps.length - 1],
      ]))
      builder.currentBlock = joinBlock;
    }
  },
  Scope: {
    // these should make their own graphs that only get tacked onto blocks
    // this is due to them having a diff inheritance chain than blocks
    // (lexical vs flow)
    exit(path) {debugger;}
  },
  UnaryExpression: {
    // TODO: should delete be special cased? (ref vs value)
    enter(path) {
      path.skipKey('argument');
      builder.setHandled(path);
      const argument = path.get('argument');
      builder.setHandled(argument);
      subtraversal(argument);
      const exprBlock = builder.currentBlock;
      const valueStub = exprBlock.steps[exprBlock.steps.length -1];
      builder.currentBlock.steps.push(new Stub(
        `${path.node.operator} $0`, [valueStub]
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
      const leftValueStub = leftBlock.steps[leftBlock.steps.length -1];
      const right = path.get('right');
      builder.setHandled(right);
      subtraversal(right);
      const rightBlock = builder.currentBlock;
      const rightValueStub = rightBlock.steps[rightBlock.steps.length -1];
      builder.currentBlock.steps.push(new Stub(
        `$0 ${path.node.operator} $1`, [leftValueStub, rightValueStub]
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
      const leftValueStub = leftBlock.steps[leftBlock.steps.length -1];
      const right = path.get('property');
      builder.setHandled(right);
      let rightValueStub;
      if (path.node.computed) {
        subtraversal(right);
        const rightBlock = builder.currentBlock;
        rightValueStub = rightBlock.steps[rightBlock.steps.length -1];
      }
      else {
        rightValueStub = builder.getConstant(path.node.property.name);
        builder.currentBlock.steps.push(rightValueStub);
      }
      builder.currentBlock.steps.push(new Stub(
        '[]', [leftValueStub, rightValueStub]
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
