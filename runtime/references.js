// Derived from Observable Notebook Kit's findReferences and checkAssignments.
// https://github.com/observablehq/notebook-kit/blob/main/src/javascript/references.ts
// https://github.com/observablehq/notebook-kit/blob/main/src/javascript/assignments.ts
//
// Notebook Kit throws on any assignment to a variable from another cell. Recho
// allows assigning to top-level `let` variables (see ./mutable.js), so here the
// check is replaced by findAssignedReferences, which reports those assignments
// instead of rejecting them.
import {ancestor} from "acorn-walk";

function isScope(node) {
  return (
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "Program"
  );
}

function isBlockScope(node) {
  return (
    node.type === "BlockStatement" ||
    node.type === "SwitchStatement" ||
    node.type === "ForInStatement" ||
    node.type === "ForOfStatement" ||
    node.type === "ForStatement" ||
    isScope(node)
  );
}

function findParentScope(parents, from, predicate) {
  for (let i = from; i >= 0; --i) if (predicate(parents[i])) return parents[i];
  return null;
}

/**
 * Returns the names a declaration pattern introduces: `x`, `[x, ...y]`,
 * `{x, y: z = 1}`, and so on.
 */
export function patternNames(node, names = []) {
  switch (node.type) {
    case "Identifier":
      names.push(node.name);
      break;
    case "ObjectPattern":
      for (const p of node.properties) patternNames(p.type === "Property" ? p.value : p, names);
      break;
    case "ArrayPattern":
      for (const e of node.elements) if (e) patternNames(e, names);
      break;
    case "RestElement":
      patternNames(node.argument, names);
      break;
    case "AssignmentPattern":
      patternNames(node.left, names);
      break;
  }
  return names;
}

/**
 * Returns the Identifier nodes of `node` that refer to variables not declared
 * within it, i.e. references to other cells or globals.
 */
export function findReferences(node) {
  const locals = new Map();
  const references = [];

  function hasLocal(node, name) {
    return locals.get(node)?.has(name) ?? false;
  }

  function declareLocal(node, id) {
    const l = locals.get(node);
    if (l) l.add(id.name);
    else locals.set(node, new Set([id.name]));
  }

  function declareClass(node) {
    if (node.id) declareLocal(node, node.id);
  }

  function declareFunction(node) {
    node.params.forEach((param) => declarePattern(param, node));
    if (node.id) declareLocal(node, node.id);
    if (node.type !== "ArrowFunctionExpression") declareLocal(node, {name: "arguments"});
  }

  function declareCatchClause(node) {
    if (node.param) declarePattern(node.param, node);
  }

  function declarePattern(node, parent) {
    for (const name of patternNames(node)) declareLocal(parent, {name});
  }

  ancestor(node, {
    VariableDeclaration(node, _state, parents) {
      const parent = findParentScope(parents, parents.length - 1, node.kind === "var" ? isScope : isBlockScope);
      node.declarations.forEach((declaration) => declarePattern(declaration.id, parent));
    },
    FunctionDeclaration(node, _state, parents) {
      const parent = findParentScope(parents, parents.length - 2, isScope);
      if (node.id) declareLocal(parent, node.id);
      declareFunction(node);
    },
    FunctionExpression: declareFunction,
    ArrowFunctionExpression: declareFunction,
    ClassDeclaration(node, _state, parents) {
      const parent = findParentScope(parents, parents.length - 2, isScope);
      if (node.id) declareLocal(parent, node.id);
    },
    ClassExpression: declareClass,
    CatchClause: declareCatchClause,
    ImportDeclaration(node, _state, [root]) {
      node.specifiers.forEach((specifier) => declareLocal(root, specifier.local));
    },
  });

  function identifier(node, _state, parents) {
    const name = node.name;
    if (name === "undefined") return;
    for (let i = parents.length - 2; i >= 0; --i) {
      if (hasLocal(parents[i], name)) return;
    }
    references.push(node);
  }

  ancestor(node, {
    Pattern(node, _state, parents) {
      if (node.type === "Identifier") identifier(node, _state, parents);
    },
    Identifier: identifier,
  });

  return references;
}

/**
 * Returns the subset of `references` (from findReferences) that are assigned
 * to: `x = …`, `x += …`, `x++`, `[x] = …`, `for (x of …)`, and so on.
 */
export function findAssignedReferences(node, references) {
  const referenceSet = new Set(references);
  const assigned = [];

  function collect(node) {
    switch (node.type) {
      case "Identifier":
        if (referenceSet.has(node)) assigned.push(node);
        break;
      case "ArrayPattern":
        for (const e of node.elements) if (e) collect(e);
        break;
      case "ObjectPattern":
        for (const p of node.properties) collect(p.type === "Property" ? p.value : p);
        break;
      case "RestElement":
        collect(node.argument);
        break;
    }
  }

  ancestor(node, {
    AssignmentExpression: ({left}) => collect(left),
    AssignmentPattern: ({left}) => collect(left),
    UpdateExpression: ({argument}) => collect(argument),
    ForOfStatement: ({left}) => collect(left),
    ForInStatement: ({left}) => collect(left),
  });

  return assigned;
}
