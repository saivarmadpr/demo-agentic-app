import vm from "node:vm";

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTimeMs: number;
}

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 10000;

export function executeCode(
  code: string,
  language: string = "javascript"
): ExecutionResult {
  if (language !== "javascript" && language !== "js") {
    return {
      success: false,
      output: "",
      error: `Unsupported language: ${language}. Only JavaScript is supported.`,
      executionTimeMs: 0,
    };
  }

  const logs: string[] = [];
  const sandbox = {
    console: {
      log: (...args: unknown[]) =>
        logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) =>
        logs.push("[ERROR] " + args.map(String).join(" ")),
      warn: (...args: unknown[]) =>
        logs.push("[WARN] " + args.map(String).join(" ")),
    },
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Error,
    TypeError,
    RangeError,
    setTimeout: undefined,
    setInterval: undefined,
    fetch: undefined,
    require: undefined,
    process: undefined,
    __dirname: undefined,
    __filename: undefined,
  };

  const context = vm.createContext(sandbox);
  const start = Date.now();

  try {
    const result = vm.runInContext(code, context, {
      timeout: TIMEOUT_MS,
      filename: "user-code.js",
    });

    const elapsed = Date.now() - start;
    const output = logs.length > 0 ? logs.join("\n") : String(result);

    return {
      success: true,
      output: output.slice(0, MAX_OUTPUT_LENGTH),
      executionTimeMs: elapsed,
    };
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    return {
      success: false,
      output: logs.join("\n"),
      error: errorMessage,
      executionTimeMs: elapsed,
    };
  }
}
