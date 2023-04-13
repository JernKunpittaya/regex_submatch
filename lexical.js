// same as original
function parseRegex(text) {
  "use strict";
  function parseSub(text, begin, end, first) {
    var i,
      sub,
      last = 0,
      node = { begin: begin, end: end },
      virNode,
      tempNode,
      stack = 0,
      parts = [];
    if (text.length === 0) {
      return "Error: empty input at " + begin + ".";
    }
    if (first) {
      for (i = 0; i <= text.length; i += 1) {
        if (i === text.length || (text[i] === "|" && stack === 0)) {
          if (last === 0 && i === text.length) {
            return parseSub(text, begin + last, begin + i, false);
          }
          sub = parseSub(text.slice(last, i), begin + last, begin + i, true);
          if (typeof sub === "string") {
            return sub;
          }
          parts.push(sub);
          last = i + 1;
        } else if (text[i] === "(") {
          stack += 1;
        } else if (text[i] === ")") {
          stack -= 1;
        }
      }
      if (parts.length === 1) {
        return parts[0];
      }
      node.type = "or";
      node.parts = parts;
    } else {
      for (i = 0; i < text.length; i += 1) {
        if (text[i] === "(") {
          last = i + 1;
          i += 1;
          stack = 1;
          while (i < text.length && stack !== 0) {
            if (text[i] === "(") {
              stack += 1;
            } else if (text[i] === ")") {
              stack -= 1;
            }
            i += 1;
          }
          if (stack !== 0) {
            return "Error: missing right bracket for " + (begin + last) + ".";
          }
          i -= 1;
          sub = parseSub(text.slice(last, i), begin + last, begin + i, true);
          if (typeof sub === "string") {
            return sub;
          }
          sub.begin -= 1;
          sub.end += 1;
          parts.push(sub);
        } else if (text[i] === "*") {
          if (parts.length === 0) {
            return "Error: unexpected * at " + (begin + i) + ".";
          }
          tempNode = {
            begin: parts[parts.length - 1].begin,
            end: parts[parts.length - 1].end + 1,
          };
          tempNode.type = "star";
          tempNode.sub = parts[parts.length - 1];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "+") {
          if (parts.length === 0) {
            return "Error: unexpected + at " + (begin + i) + ".";
          }
          virNode = {
            begin: parts[parts.length - 1].begin,
            end: parts[parts.length - 1].end + 1,
          };
          virNode.type = "star";
          virNode.sub = parts[parts.length - 1];
          tempNode = {
            begin: parts[parts.length - 1].begin,
            end: parts[parts.length - 1].end + 1,
          };
          tempNode.type = "cat";
          tempNode.parts = [parts[parts.length - 1], virNode];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "?") {
          if (parts.length === 0) {
            return "Error: unexpected + at " + (begin + i) + ".";
          }
          virNode = {
            begin: parts[parts.length - 1].begin,
            end: parts[parts.length - 1].end + 1,
          };
          virNode.type = "empty";
          virNode.sub = parts[parts.length - 1];
          tempNode = {
            begin: parts[parts.length - 1].begin,
            end: parts[parts.length - 1].end + 1,
          };
          tempNode.type = "or";
          tempNode.parts = [parts[parts.length - 1], virNode];
          parts[parts.length - 1] = tempNode;
        } else if (text[i] === "ϵ") {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "empty";
          parts.push(tempNode);
        } else if (Array.isArray(text[i])) {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "text";
          tempNode.text = text[i][0];
          parts.push(tempNode);
        } else {
          tempNode = { begin: begin + i, end: begin + i + 1 };
          tempNode.type = "text";
          tempNode.text = text[i];
          parts.push(tempNode);
        }
      }
      if (parts.length === 1) {
        return parts[0];
      }
      node.type = "cat";
      node.parts = parts;
    }
    return node;
  }

  let new_text = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] == "\\") {
      new_text.push([text[i + 1]]);
      i += 2;
    } else {
      new_text.push(text[i]);
      i += 1;
    }
  }
  return parseSub(new_text, 0, new_text.length, true);
}

function checkBeginGroup(index, submatches) {
  for (let i = 0; i < submatches.length; i++) {
    if (submatches[i][0] == index) {
      return i;
    }
  }
  return false;
}
function checkEndGroup(index, submatches) {
  for (let i = 0; i < submatches.length; i++) {
    if (submatches[i][1] == index) {
      return i;
    }
  }
  return false;
}
// create M1
// submatches = [[begin1, end1], [begin2, end2], ...] where (begin1 ...... end1)
function regexToM1(text, submatches) {
  "use strict";
  function generateGraph(node, start, end, count) {
    var i, last, temp, tempStart, tempEnd;
    if (!start.hasOwnProperty("id")) {
      start.id = count;
      count += 1;
    }
    switch (node.type) {
      case "empty":
        let mem = start.type + end.type;
        end = start;
        end.type = mem;
        return [count, end];
      case "text":
        start.edges.push([node.text, end]);
        break;
      case "cat":
        last = start;
        for (i = 0; i < node.parts.length - 1; i += 1) {
          temp = { type: "", edges: [] };
          let result = generateGraph(node.parts[i], last, temp, count);
          count = result[0];
          temp = result[1];
          last = temp;
        }
        count = generateGraph(
          node.parts[node.parts.length - 1],
          last,
          end,
          count
        )[0];
        break;
      case "or":
        for (i = 0; i < node.parts.length; i += 1) {
          tempStart = { type: "", edges: [] };
          tempEnd = { type: "", edges: [["ϵ", end]] };
          start.edges.push(["ϵ", tempStart]);
          count = generateGraph(node.parts[i], tempStart, tempEnd, count)[0];
        }
        break;

      // Use
      case "star":
        tempStart = { type: "", edges: [] };
        tempEnd = {
          type: "",
          edges: [
            ["ϵ", tempStart],
            ["ϵ", end],
          ],
        };
        start.edges.push(["ϵ", tempStart]);
        start.edges.push(["ϵ", end]);
        count = generateGraph(node.sub, tempStart, tempEnd, count)[0];
        break;
    }
    if (!end.hasOwnProperty("id")) {
      end.id = count;
      count += 1;
    }
    return [count, end];
  }
  var ast = parseRegex(text),
    start = { type: "start", edges: [] },
    accept = { type: "accept", edges: [] };
  if (typeof ast === "string") {
    return ast;
  }
  generateGraph(ast, start, accept, 0);
  return start;
}

module.exports = { parseRegex, checkBeginGroup, checkEndGroup, regexToM1 };
