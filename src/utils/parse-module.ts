import { removeComments } from "./serialize";
import { deserialize } from "./deserialize";

export function parseModule(code) {
  code = removeComments(code);
  code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}")).trim();

  return deserialize(`{${code}}`);
}
