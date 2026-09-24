/**
 * Minimal activity indicator for long runs.
 *
 * Requested in #3: "there is not enough user feedback on the progress of the
 * tool and whether or not it is even running". On a large project the type
 * check can take minutes with nothing on screen.
 *
 * Three deliberate constraints:
 *
 * - No dependency. The issue suggested cli-progress; for a tool whose job is
 *   shrinking a project's dependency surface, adding one for a spinner is a
 *   poor trade.
 * - It writes to stderr, so piping stdout to a file or another process is
 *   unaffected.
 * - It is silent whenever stderr is not a TTY, which covers the issue's other
 *   concern -- "there might be a need to allow a user to pass --quiet from
 *   blowing up some console outputs if this is being run in CI" -- without
 *   needing a flag at all.
 *
 * It is not a progress bar. type-coverage-core's lint() is a single opaque
 * call, so there is no percentage to report; this only shows that work is
 * happening.
 */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 80;

export type Progress = {
  update(label: string): void;
  stop(): void;
};

const noop: Progress = {
  update: () => undefined,
  stop: () => undefined
};

export const createProgress = (
  stream: NodeJS.WriteStream = process.stderr
): Progress => {
  // process.env.CI is checked as well as isTTY: some CI runners allocate a
  // pseudo-terminal, which would otherwise fill the log with spinner frames.
  if (!stream.isTTY || process.env.CI) {
    return noop;
  }

  let frame = 0;
  let label = "";

  const render = () => {
    stream.write(`\r${FRAMES[frame % FRAMES.length]} ${label}`);
    frame += 1;
  };

  const timer = setInterval(render, INTERVAL_MS);
  // Do not hold the process open on the spinner alone.
  timer.unref?.();

  return {
    update(next: string) {
      label = next;
      render();
    },
    stop() {
      clearInterval(timer);
      // Clear the line so the spinner never collides with real output.
      stream.write(`\r${" ".repeat(label.length + 2)}\r`);
    }
  };
};
