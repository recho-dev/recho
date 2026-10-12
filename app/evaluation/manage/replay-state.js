const OUTPUT_PREFIX = "//➜";
const ERROR_PREFIX = "//✗";

function isLineBoundary(doc, pos) {
  return pos === 0 || doc[pos - 1] === "\n";
}

function getLineEnd(doc, start) {
  const lineEnd = doc.indexOf("\n", start);
  return lineEnd === -1 ? doc.length : lineEnd;
}

function isRuntimeLine(line) {
  return line.startsWith(OUTPUT_PREFIX) || line.startsWith(ERROR_PREFIX);
}

function isRuntimeInsert(insert) {
  const normalized = insert.endsWith("\n") ? insert.slice(0, -1) : insert;
  if (!normalized) {
    return false;
  }

  return normalized.split("\n").every(isRuntimeLine);
}

function isRuntimeReplacementTarget(target) {
  const normalized = target.endsWith("\n") ? target.slice(0, -1) : target;
  if (!normalized) {
    return false;
  }

  return normalized.split("\n").every(isRuntimeLine);
}

function looksLikeCodeLine(line) {
  const trimmed = line.trimStart();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return false;
  }

  return (
    /^(const|let|var|function|class|if|for|while|switch|return|echo|await|import|export)\b/.test(trimmed) ||
    /[;=(){}[\].]/.test(trimmed)
  );
}

function buildUncommentCandidates(task) {
  const targetDoc = task?.finalCode || task?.latestCode || "";
  const candidates = new Set();

  for (const line of targetDoc.split("\n")) {
    if (!line.trim() || isRuntimeLine(line)) {
      continue;
    }

    candidates.add(`// ${line}`);
  }

  return candidates;
}

function getSelectionAnchor(selection) {
  if (!selection?.length) {
    return null;
  }

  return selection[0]?.head ?? selection[0]?.anchor ?? selection[0]?.from ?? null;
}

function chooseRepresentativeChange(changes, anchor) {
  if (!changes?.length) {
    return null;
  }
  if (anchor == null) {
    return changes[0];
  }

  return changes.reduce((closest, current) => {
    if (!closest) {
      return current;
    }

    const closestDistance = Math.abs(closest.from - anchor);
    const currentDistance = Math.abs(current.from - anchor);
    return currentDistance < closestDistance ? current : closest;
  }, null);
}

function toHighlightRange(change) {
  const insertLength = change.insert?.length ?? 0;
  return {
    from: change.from,
    to: change.from + insertLength,
  };
}

function getReplayFocus(tx) {
  if (!tx?.docChanged || !tx.changes?.length) {
    return {scrollPos: null, highlights: []};
  }

  const selectionAnchor = getSelectionAnchor(tx.selection);
  const representative = chooseRepresentativeChange(tx.changes, selectionAnchor);
  const highlightChanges = tx.annotations?.remote === true && representative ? [representative] : tx.changes;
  const highlights = highlightChanges.map(toHighlightRange);
  const scrollPos = representative?.from ?? selectionAnchor ?? null;

  return {scrollPos, highlights};
}

function isRuntimeChangeValid(doc, change) {
  if (!isLineBoundary(doc, change.from)) {
    return false;
  }

  if (change.from === change.to) {
    return true;
  }

  return isRuntimeReplacementTarget(doc.slice(change.from, change.to));
}

function findFirstInvalidRuntimeChange(doc, changes) {
  const invalidChange = changes.find((change) => !isRuntimeChangeValid(doc, change));
  return invalidChange?.from ?? null;
}

function canApplyRuntimeChangesCleanly(doc, changes) {
  return findFirstInvalidRuntimeChange(doc, changes) === null;
}

function stripRuntimeLinesFrom(doc, fromPos) {
  const nextLines = [];
  let offset = 0;

  for (const line of doc.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;

    if (lineStart >= fromPos && isRuntimeLine(line)) {
      continue;
    }

    nextLines.push(line);
  }

  return nextLines.join("\n");
}

function repairMissingCommentToggles(doc, changes, uncommentCandidates) {
  let repairedDoc = doc;
  let repaired = false;

  const sorted = [...changes].sort((a, b) => a.from - b.from);
  for (const change of sorted) {
    if (change.from !== change.to || !isRuntimeInsert(change.insert)) {
      continue;
    }
    if (!isLineBoundary(repairedDoc, change.from)) {
      continue;
    }

    const lineEnd = getLineEnd(repairedDoc, change.from);
    const line = repairedDoc.slice(change.from, lineEnd);
    if (!line.startsWith("// ") || isRuntimeLine(line)) {
      continue;
    }

    const uncommented = line.slice(3);
    if (!uncommentCandidates.has(line) && !looksLikeCodeLine(uncommented)) {
      continue;
    }

    repairedDoc = repairedDoc.slice(0, change.from) + uncommented + repairedDoc.slice(lineEnd);
    repaired = true;
  }

  return {doc: repairedDoc, repaired};
}

export function applyChanges(doc, changes) {
  const sorted = [...changes].sort((a, b) => b.from - a.from);
  let result = doc;
  for (const change of sorted) {
    result = result.slice(0, change.from) + change.insert + result.slice(change.to);
  }
  return result;
}

export function getTaskDurationMs(task) {
  if (!task) {
    return 0;
  }

  const checkpoints = [
    task.endTime != null ? task.endTime - task.startTime : 0,
    task.lastCheckpointTime != null ? task.lastCheckpointTime - task.startTime : 0,
    task.transactions.at(-1)?.timestamp ?? 0,
  ];

  return Math.max(0, ...checkpoints);
}

export function buildReplayStateData(task) {
  if (!task) {
    return {
      docStates: [""],
      scrollPositions: [null],
      highlights: [[]],
      totalTransactions: 0,
      taskDurationMs: 0,
      repairedRuntimeTransactions: 0,
      skippedRuntimeTransactions: 0,
    };
  }

  const states = [];
  const positions = [];
  const highlights = [];
  let doc = task.initialCode || "";
  let latestScrollPos = null;
  let repairedRuntimeTransactions = 0;
  let skippedRuntimeTransactions = 0;
  const uncommentCandidates = buildUncommentCandidates(task);

  states.push(doc);
  positions.push(latestScrollPos);
  highlights.push([]);

  for (const tx of task.transactions) {
    let txHighlights = [];
    if (tx.docChanged && tx.changes.length > 0) {
      const isRuntime = tx.annotations?.remote === true;
      let workingDoc = doc;
      let repaired = false;

      if (isRuntime && !canApplyRuntimeChangesCleanly(workingDoc, tx.changes)) {
        const repairResult = repairMissingCommentToggles(workingDoc, tx.changes, uncommentCandidates);
        if (repairResult.repaired) {
          workingDoc = repairResult.doc;
          repaired = true;
        }
      }

      if (isRuntime) {
        const firstInvalidFrom = findFirstInvalidRuntimeChange(workingDoc, tx.changes);
        if (firstInvalidFrom !== null) {
          const strippedDoc = stripRuntimeLinesFrom(workingDoc, firstInvalidFrom);
          if (strippedDoc !== workingDoc) {
            workingDoc = strippedDoc;
            repaired = true;
          }
        }
      }

      if (repaired) {
        doc = workingDoc;
        states[states.length - 1] = doc;
        repairedRuntimeTransactions += 1;
      }

      if (isRuntime && !canApplyRuntimeChangesCleanly(doc, tx.changes)) {
        skippedRuntimeTransactions += 1;
      } else {
        doc = applyChanges(doc, tx.changes);
        const focus = getReplayFocus(tx);
        txHighlights = focus.highlights;
        latestScrollPos = focus.scrollPos ?? latestScrollPos;
      }
    }

    positions.push(latestScrollPos);
    states.push(doc);
    highlights.push(txHighlights);
  }

  return {
    docStates: states,
    scrollPositions: positions,
    highlights,
    totalTransactions: task.transactions.length,
    taskDurationMs: getTaskDurationMs(task),
    repairedRuntimeTransactions,
    skippedRuntimeTransactions,
  };
}
