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
    // console.log("exist already, id: ", m1.id);
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
      break;
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
  return { q2: q2_m2, trans: transition };
}
function setsAreEqual(set1, set2) {
  return (
    set1.size === set2.size && [...set1].every((element) => set2.has(element))
  );
}

function M2ToM3(q2_m2, transition) {
  var q3 = [];
  var q3_m3 = new Set();
  var transition_3 = {};
  var visited = new Set();
  var start_q2 = new Set();
  var accepted = new Set();
  var start;
  // set q3 to [{f}]
  for (let key in q2_m2) {
    if (q2_m2[key].type == "accept") {
      var temp = new Set();
      temp.add(q2_m2[key]);
      start = q2_m2[key].id.toString();
      q3.push(temp);
    }
    if (q2_m2[key].type == "start") {
      start_q2.add(key);
    }
  }

  // inside loop
  while (q3.length > 0) {
    var state_set = q3.pop();
    var states_id = [];
    for (const state of state_set) {
      states_id.push(state.id);
    }
    states_id.sort((a, b) => a - b);
    states_id = states_id.toString();
    if (visited.has(states_id)) {
      continue;
    }
    var checkStart = states_id.split(",");
    for (const state of checkStart) {
      if (start_q2.has(state)) {
        accepted.add(states_id);
        break;
      }
    }
    q3_m3.add(states_id);
    visited.add(states_id);
    var alp_dict = {};
    for (const state of state_set) {
      for (let i = 0; i < transition.length; i++) {
        if (transition[i][2].id == state.id) {
          if (!(transition[i][1] in alp_dict)) {
            alp_dict[transition[i][1]] = new Set();
          }
          alp_dict[transition[i][1]].add(transition[i][0]);
        }
      }
    }
    for (let alp in alp_dict) {
      if (alp_dict[alp].size > 0) {
        q3.push(alp_dict[alp]);
        var alp_string = [];
        for (const state of alp_dict[alp]) {
          alp_string.push(state.id);
        }
        alp_string.sort((a, b) => a - b);
        alp_string = alp_string.toString();
        if (!(states_id in transition_3)) {
          transition_3[states_id] = {};
        }
        transition_3[states_id][alp] = alp_string;
      }
    }
  }
  return {
    q3: q3_m3,
    start_state: start,
    accept_states: accepted,
    trans: transition_3,
  };
}
function SimulateM1(m1) {
  function simulate_M1(m1, q1, tran, accepted) {
    if (q1.has(m1.id)) {
      // console.log("exist already, id: ", m1.id);
      return;
    } else {
      q1.add(m1.id);
    }
    var edges = m1.edges;
    if (m1.type == "accept") {
      accepted.push(m1.id);
      return;
    }
    for (let i = 0; i < m1.edges.length; i++) {
      // console.log("edge of ", m1.id, " : ", m1.edges[i][0]);
      if (!(m1.id in tran)) {
        tran[m1.id] = {};
      }
      tran[m1.id][m1.edges[i][0].toString()] = m1.edges[i][1].id.toString();
      simulate_M1(m1.edges[i][1], q1, tran, accepted);
    }
  }
  var q1 = new Set();
  var tran = {};
  var accepted = [];
  simulate_M1(m1, q1, tran, accepted);
  return { q1: q1, accepted: accepted, tran: tran };
}
function piOnM1_path(simplified_m1, start_id, end_id, visited = new Set()) {
  if (start_id == end_id) {
    return "";
  }
  visited.add(start_id);
  // var edges = start.edges;
  for (let alp in simplified_m1["tran"][start_id]) {
    // skip alphabet edge
    if (alp.split(",").length == 1) {
      continue;
    }
    if (visited.has(simplified_m1["tran"][start_id][alp])) {
      continue;
    }
    if (piOnM1(m1, edges[i][1], end, visited)) {
      return true;
    }
  }
  return false;
}
function findAllPaths(graph, start_id, end_id) {
  const visited = new Set();
  const paths = [];

  function dfs(node_id, path, tran) {
    if (node_id === end_id) {
      paths.push({ path: path, tran: tran });
      return;
    }

    visited.add(node_id);

    for (const key in graph["tran"][node_id]) {
      if (
        key.split(",").length > 1 &&
        !visited.has(graph["tran"][node_id][key])
      ) {
        // console.log(
        //   "from ",
        //   node_id,
        //   " with ",
        //   key,
        //   " to ",
        //   graph["tran"][node_id][key]
        // );
        // console.log("one here: ", [...path, graph["tran"][node_id][key]]);
        // console.log("second here ", [...tran, key]);
        dfs(
          graph["tran"][node_id][key],
          [...path, graph["tran"][node_id][key]],
          [...tran, key]
        );
      }
    }

    visited.delete(node_id);
  }

  dfs(start_id, [start_id], []);

  return paths;
}
function tranMoreThan(tran1, tran2) {
  const num = () => (tran1.length < tran2.length ? tran1.length : tran2.length);
  for (let i = 0; i < num; i++) {
    var tag1 = tran1[i].split(",")[0];
    var pri1 = tran1[i].split(",")[1];
    var tag2 = tran2[i].split(",")[0];
    var pri2 = tran2[i].split(",")[1];
    if (tag1 == "ϵ" && tag2 == "ϵ") {
      if (parseInt(pri1) < parseInt(pri2)) {
        return 1;
      } else if (parseInt(pri1) > parseInt(pri2)) {
        return -1;
      }
    }
  }
  if (tran1.length == tran2.length) {
    return 0;
  } else {
    const result = () => (tran1.length < tran2.length ? -1 : 1);
    return result;
  }
}

const maxIndex = (arr, comparator) => {
  let maxIndex = 0;
  for (let i = 1; i < arr.length; i++) {
    if (comparator(arr[i], arr[maxIndex]) == 1) {
      maxIndex = i;
    }
  }
  return maxIndex;
};
function onlyTag(arr) {
  result = [];
  for (const ele of arr) {
    if (ele.split(",")[0] != "ϵ") {
      result.push(ele);
    }
  }
  return result;
}
function createM4(m1, m3) {
  var simplified_m1 = SimulateM1(m1);
  var q4 = {};
  var accepted = [];
  // q4 = {state: {b: next, a: next}, ...}
  for (let key in simplified_m1["tran"]) {
    for (let alp in simplified_m1["tran"][key]) {
      if (alp.split(",").length == 1) {
        if (!(key in q4)) {
          q4[key] = {};
        }
        q4[key][alp] = simplified_m1["tran"][key][alp];
      }
    }
  }
  // finish q4, now search in m1 stuffs. From Q3.
  var all_trans = {};
  for (const subset of m3["q3"]) {
    var states = subset.split(",");
    for (const p in q4) {
      var paths = [];
      var trans = [];
      for (const key in q4[p]) {
        for (const state of states) {
          var search = findAllPaths(simplified_m1, q4[p][key], state);
          if (search.length > 0) {
            for (const oneSearch of search) {
              paths.push(oneSearch["path"]);
              trans.push(oneSearch["tran"]);
            }
          }
        }
      }
      if (paths.length > 0) {
        if (!(p in all_trans)) {
          all_trans[p] = {};
        }
        var maxInd = maxIndex(trans, tranMoreThan);
        var best_path = paths[maxInd];
        all_trans[p][subset] = [
          best_path[best_path.length - 1],
          // put JSON.stringify for reading sake
          // JSON.stringify(onlyTag(trans[maxInd])),
          onlyTag(trans[maxInd]),
        ];
      }
    }
  }
  all_trans["start"] = {};
  for (const subset of m3["q3"]) {
    var states = subset.split(",");
    var paths = [];
    var trans = [];
    for (const state of states) {
      var search = findAllPaths(simplified_m1, "0", state);
      if (search.length > 0) {
        for (const oneSearch of search) {
          paths.push(oneSearch["path"]);
          trans.push(oneSearch["tran"]);
        }
      }
      if (paths.length > 0) {
        // console.log("all path of ", states, " is ", trans);
        var maxInd = maxIndex(trans, tranMoreThan);
        var best_path = paths[maxInd];
        all_trans["start"][subset] = [
          best_path[best_path.length - 1],
          // put JSON.stringify for reading sake
          // JSON.stringify(onlyTag(trans[maxInd])),
          onlyTag(trans[maxInd]),
        ];
      }
    }
  }
  // Not set, will standardize later
  var q4_withAcc = Object.keys(q4);
  for (const ele of simplified_m1["accepted"]) {
    q4_withAcc.push(ele.toString());
  }
  console.log("trannnn ", all_trans);
  return {
    q4: q4_withAcc,
    start: "start",
    accepted: simplified_m1["accepted"].toString(),
    tran: all_trans,
  };
}
// show what state transition is included for revealing a subgroup match.
// memTags {tag1: set("[from1, to1]","[from2, to2]"", ...), tag2: [...]}
// memTag {tag1: }
// boolTag{tag1: true, tag2: False}
function findMatchStateM4(m4) {
  var tranGraph = m4["tran"];
  var allTags = {};
  // dfa not have cycle, except self referential
  function findMatchState(node_id, memTags, boolTags) {
    if (node_id == m4["accepted"]) {
      for (const key in memTags) {
        if (!(key in allTags)) {
          allTags[key] = new Set();
        }
        for (const strTran of memTags[key]) {
          allTags[key].add(strTran);
        }
      }
      return;
    }
    // duplicate memTags and boolTags
    var cl_memTags = {};
    for (const key in memTags) {
      cl_memTags[key] = new Set(memTags[key]);
    }
    // console.log("check ", node_id, cl_memTags);
    var cl_boolTags = Object.assign({}, boolTags);
    // take care of self-referential
    for (const key in tranGraph[node_id]) {
      if (tranGraph[node_id][key][0] == node_id) {
        var tags = tranGraph[node_id][key][1];
        if (tags.length > 0) {
          for (const tag of tags) {
            // console.log("tagg ", tag);
            var split_tag = tag.split(",");
            if (split_tag[0] == "E") {
              cl_boolTags[split_tag[1]] = false;
            } else {
              cl_boolTags[split_tag[1]] = true;
            }
          }
        }
        for (const boolTag in cl_boolTags) {
          if (cl_boolTags[boolTag]) {
            if (!(boolTag in cl_memTags)) {
              cl_memTags[boolTag] = new Set();
            }
            cl_memTags[boolTag].add(JSON.stringify([node_id, node_id]));
          }
        }
        break;
      }
    }

    for (const key in tranGraph[node_id]) {
      if (tranGraph[node_id][key][0] == node_id) {
        continue;
      }
      var cl2_memTags = {};
      for (const key in cl_memTags) {
        cl2_memTags[key] = new Set(cl_memTags[key]);
      }
      // console.log("check ", node_id, cl_memTags);
      var cl2_boolTags = Object.assign({}, cl_boolTags);
      var tags = tranGraph[node_id][key][1];
      if (tags.length > 0) {
        for (const tag of tags) {
          var split_tag = tag.split(",");
          if (split_tag[0] == "E") {
            cl2_boolTags[split_tag[1]] = false;
          } else {
            cl2_boolTags[split_tag[1]] = true;
          }
        }
      }
      for (const boolTag in cl2_boolTags) {
        if (cl2_boolTags[boolTag]) {
          if (!(boolTag in cl2_memTags)) {
            cl2_memTags[boolTag] = new Set();
          }
          cl2_memTags[boolTag].add(
            JSON.stringify([node_id, tranGraph[node_id][key][0]])
          );
        }
      }
      findMatchState(tranGraph[node_id][key][0], cl2_memTags, cl2_boolTags);
    }
  }
  findMatchState(m4["start"], {}, {});
  return allTags;
}
function regexSubmatch(text, m3, m4) {
  var q3_rev_mem = [m3["start_state"]];
  var node = m3["start_state"];
  // run through m3
  for (let i = text.length - 1; i >= 0; i--) {
    if (node in m3["trans"] && text[i] in m3["trans"][node]) {
      node = m3["trans"][node][text[i]];
      q3_rev_mem.push(node);
    } else {
      throw new Error("Text not accepted by regex");
    }
  }

  // change later in circom
  var submatch = {};
  // run through m4
  node = "start";
  for (let i = 0; i <= text.length; i++) {
    if (m4["tran"][node][q3_rev_mem[text.length - i]][1].length > 0) {
      // console.log("i ", i);
      for (const tag of m4["tran"][node][q3_rev_mem[text.length - i]][1]) {
        submatch[tag] = i;
      }
    }
    node = m4["tran"][node][q3_rev_mem[text.length - i]][0];
  }
  // console.log("subbbb ", submatch);
  tag_result = {};
  for (const key in submatch) {
    if (!(key.split(",")[1] in tag_result)) {
      tag_result[key.split(",")[1]] = [submatch[key]];
    } else {
      tag_result[key.split(",")[1]].push(submatch[key]);
    }
  }
  // console.log("tag result ", tag_result);
  return tag_result;
}

function regexSubmatchFromState(text, m3, m4) {
  var q3_rev_mem = [m3["start_state"]];
  var node = m3["start_state"];
  // run through m3
  for (let i = text.length - 1; i >= 0; i--) {
    if (node in m3["trans"] && text[i] in m3["trans"][node]) {
      node = m3["trans"][node][text[i]];
      q3_rev_mem.push(node);
    } else {
      throw new Error("Text not accepted by regex");
    }
  }

  var allTags = findMatchStateM4(m4);
  var submatch = {};
  // run through m4
  node = "start";
  for (let i = 0; i <= text.length; i++) {
    for (const tag in allTags) {
      if (
        allTags[tag].has(
          JSON.stringify([
            node,
            m4["tran"][node][q3_rev_mem[text.length - i]][0],
          ])
        )
      ) {
        if (!(tag in submatch)) {
          submatch[tag] = new Set();
        }
        submatch[tag].add(i);
      }
    }
    node = m4["tran"][node][q3_rev_mem[text.length - i]][0];
  }

  return submatch;
}

// function
module.exports = {
  parseRegex,
  checkBeginGroup,
  checkEndGroup,
  regexToM1,
  M1ToM2,
  findQ2,
  piOnM1,
  deltaQ2,
  M2ToM3,
  createM4,
  SimulateM1,
  findAllPaths,
  regexSubmatch,
  findMatchStateM4,
  regexSubmatchFromState,
};
