import {describe, expect, it} from "vitest";
import {applyChanges, buildReplayStateData} from "../../app/evaluation/manage/replay-state.js";

describe("buildReplayStateData", () => {
  it("repairs missing uncomment edits before applying later runtime updates", () => {
    const initialCode = [
      'const greeting = echo("hello world");',
      "",
      '// echo("  too much space  ".trim());',
      "",
      'const word = echo("hello");',
      "",
    ].join("\n");

    const runtime1 = {
      index: 1,
      timestamp: 1000,
      docChanged: true,
      annotations: {remote: true},
      selection: [],
      changes: [
        {
          from: initialCode.indexOf('const greeting = echo("hello world");'),
          to: initialCode.indexOf('const greeting = echo("hello world");'),
          insert: '//➜ "hello world"\n',
        },
        {
          from: initialCode.indexOf('const word = echo("hello");'),
          to: initialCode.indexOf('const word = echo("hello");'),
          insert: '//➜ "hello"\n',
        },
      ],
    };

    const afterRuntime1 = applyChanges(initialCode, runtime1.changes);
    const uncommentedDoc = afterRuntime1.replace(
      '// echo("  too much space  ".trim());',
      'echo("  too much space  ".trim());',
    );
    const clearedDoc = uncommentedDoc.replace('//➜ "hello"\n', "");

    const runtime2 = {
      index: 2,
      timestamp: 2000,
      docChanged: true,
      annotations: {remote: true},
      selection: [],
      changes: [
        {
          from: uncommentedDoc.indexOf('//➜ "hello world"\n'),
          to: uncommentedDoc.indexOf('//➜ "hello world"\n') + '//➜ "hello world"\n'.length,
          insert: '//➜ "hello world"\n',
        },
        {
          from: uncommentedDoc.indexOf('echo("  too much space  ".trim());'),
          to: uncommentedDoc.indexOf('echo("  too much space  ".trim());'),
          insert: '//➜ "too much space"\n',
        },
        {
          from: clearedDoc.indexOf('const word = echo("hello");'),
          to: clearedDoc.indexOf('const word = echo("hello");'),
          insert: '//➜ "hello"\n',
        },
      ],
    };

    const finalDoc = applyChanges(uncommentedDoc, runtime2.changes);
    const replay = buildReplayStateData({
      startTime: 0,
      endTime: 2000,
      lastCheckpointTime: 2000,
      initialCode,
      latestCode: finalDoc,
      finalCode: finalDoc,
      transactions: [runtime1, runtime2],
      pauseEvents: [],
    });

    expect(replay.repairedRuntimeTransactions).toBe(1);
    expect(replay.skippedRuntimeTransactions).toBe(0);
    expect(replay.docStates[1]).toContain('echo("  too much space  ".trim());');
    expect(replay.docStates[2]).toContain('//➜ "too much space"\necho("  too much space  ".trim());');
    expect(replay.docStates[2]).toContain('//➜ "hello"\nconst word = echo("hello");');
    expect(replay.docStates[2]).not.toContain("trim());echo(");
  });
});
