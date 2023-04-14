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
// Assume submatch already ordered by order of (
function checkBeginGroup(index, submatches) {
  let result = [];
  for (let i = 0; i < submatches.length; i++) {
    if (submatches[i][0] == index) {
      result.push(i);
    }
  }
  if (result.length != 0) {
    return result;
  }
  return false;
}
// reverse order
function checkEndGroup(index, submatches) {
  let result = [];
  for (let i = submatches.length - 1; i >= 0; i--) {
    if (submatches[i][1] == index) {
      result.push(i);
    }
  }
  if (result.length != 0) {
    return result;
  }
  return false;
}
// create M1
// submatches = [[begin1, end1], [begin2, end2], ...]
function regexToM1(text, submatches) {
  "use strict";
  function generateGraph(node, start, end, count, submatches, memS, memE) {
    var i,
      last,
      temp,
      tempStart,
      tempEnd,
      beginTag,
      endTag,
      realStart,
      interEnd;
    if (!start.hasOwnProperty("id")) {
      start.id = count;
      count += 1;
    }
    realStart = start;
    beginTag = checkBeginGroup(node.begin, submatches);
    // console.log("beginTag: ", beginTag);
    endTag = checkEndGroup(node.end - 1, submatches);
    // console.log("EndTag: ", endTag);

    if (beginTag) {
      temp = start;
      last = start;
      for (let i = 0; i < beginTag.length; i++) {
        if (!memS.includes(beginTag[i])) {
          memS.push(beginTag[i]);
          last = { type: "", edges: [] };
          temp.edges.push([["S", beginTag[i]], last]);
          last.id = count;
          count += 1;
          temp = last;
        }
      }
      realStart = last;
      // console.log("real ", realStart);
    }
    // interEnd is stuffs state before end. Use as end in this stuffs. will assign id at the end.
    interEnd = end;
    if (endTag) {
      var newTag = [];

      for (let i = 0; i < endTag.length; i++) {
        if (!memE.includes(endTag[i])) {
          newTag.push(endTag[i]);
        }
      }
      if (newTag.length >= 1) {
        interEnd = { type: "", edges: [] };
        temp = interEnd;
        last = interEnd;
        for (let i = 0; i < newTag.length - 1; i++) {
          memE.push(newTag[i]);
          last = { type: "", edges: [] };
          temp.edges.push([["E", newTag[i]], last]);
          temp = last;
        }
        memE.push(newTag[newTag.length - 1]);
        last.edges.push([["E", newTag[newTag.length - 1]], end]);
      } else {
        interEnd = end;
      }
    }

    switch (node.type) {
      // Ignore this case first :)
      // case "empty":
      //   let mem = realStart.type + end.type;
      //   end = realStart;
      //   end.type = mem;
      //   return [count, end];
      case "text":
        realStart.edges.push([[node.text], interEnd]);
        break;
      case "cat":
        last = realStart;
        for (i = 0; i < node.parts.length - 1; i += 1) {
          temp = { type: "", edges: [] };
          let result = generateGraph(
            node.parts[i],
            last,
            temp,
            count,
            submatches,
            memS,
            memE
          );
          count = result[0];
          temp = result[1];
          last = temp;
        }
        count = generateGraph(
          node.parts[node.parts.length - 1],
          last,
          interEnd,
          count,
          submatches,
          memS,
          memE
        )[0];
        break;
      case "or":
        for (i = 0; i < node.parts.length; i += 1) {
          tempStart = { type: "", edges: [] };
          realStart.edges.push([["ϵ", i], tempStart]);
          count = generateGraph(
            node.parts[i],
            tempStart,
            interEnd,
            count,
            submatches,
            memS,
            memE
          )[0];
        }
        break;
      //Use only greedy, maybe implement reluctant later
      case "star":
        tempStart = { type: "", edges: [] };
        tempEnd = {
          type: "",
          edges: [
            [["ϵ", 0], tempStart],
            [["ϵ", 1], interEnd],
          ],
        };
        realStart.edges.push([["ϵ", 0], tempStart]);
        realStart.edges.push([["ϵ", 1], interEnd]);
        count = generateGraph(
          node.sub,
          tempStart,
          tempEnd,
          count,
          submatches,
          memS,
          memE
        )[0];
        break;
    }
    var backMargin = interEnd;
    // console.log("check: ", backMargin);
    while (backMargin != end) {
      if (!backMargin.hasOwnProperty("id")) {
        backMargin.id = count;
        count += 1;
      }
      backMargin = backMargin.edges[0][1];
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
  generateGraph(ast, start, accept, 0, submatches, [], []);
  return start;
}

function findQ2(m1, q2, mem = new Set()) {
  if (mem.has(m1)) {
    console.log("exist already, id: ", m1.id);
    return;
  } else {
    mem.add(m1);
  }
  var edges = m1.edges;
  if (m1.type == "accept") {
    q2.push(m1);
    return;
  }
  for (let i = 0; i < edges.length; i++) {
    if (edges[i][0].length == 1) {
      q2.push(m1);
    }
  }

  for (let i = 0; i < m1.edges.length; i++) {
    // console.log("edge of ", m1.id, " : ", m1.edges[i][0]);
    findQ2(m1.edges[i][1], q2, mem);
  }
}
function piOnM1(m1, start, end, visited = new Set()) {
  if (start == end) {
    return true;
  }
  visited.add(start);
  var edges = start.edges;
  for (let i = 0; i < edges.length; i++) {
    // skip alphabet edge
    if (edges[i][0].length == 1) {
      continue;
    }
    if (visited.has(edges[i][1])) {
      continue;
    }
    if (piOnM1(m1, edges[i][1], end, visited)) {
      return true;
    }
  }
  return false;
}
function deltaQ2(m1, q2) {
  result = [];
  for (let i = 0; i < q2.length; i++) {
    for (let j = 0; j < q2.length; j++) {
      var start = q2[i];
      var end = q2[j];
      for (let k = 0; k < start.edges.length; k++) {
        if (start.edges[k][0].length == 1) {
          if (piOnM1(m1, start.edges[k][1], end)) {
            result.push([start, start.edges[k][0][0], end]);
          }
        }
      }
    }
  }
  return result;
}
function M1ToM2(m1) {
  "use strict";
  var q2 = [];
  findQ2(m1, q2);
  for (let i = 0; i < q2.length; i++) {
    if (piOnM1(m1, m1, q2[i])) {
      q2[i].type = "start";
    }
  }
  var transition = deltaQ2(m1, q2);
  var q2_m2 = {};
  for (let i = 0; i < transition.length; i++) {
    if (!q2_m2.hasOwnProperty(transition[i][0].id)) {
      q2_m2[transition[i][0].id] = {
        type: transition[i][0].type,
        edges: [],
        id: transition[i][0].id,
      };
    }
    if (!q2_m2.hasOwnProperty(transition[i][2].id)) {
      q2_m2[transition[i][2].id] = {
        type: transition[i][2].type,
        edges: [],
        id: transition[i][2].id,
      };
    }
    q2_m2[transition[i][0].id].edges.push([
      transition[i][1],
      q2_m2[transition[i][2].id],
    ]);
  }
  return q2_m2;
}

module.exports = {
  parseRegex,
  checkBeginGroup,
  checkEndGroup,
  regexToM1,
  M1ToM2,
  findQ2,
  piOnM1,
  deltaQ2,
};
