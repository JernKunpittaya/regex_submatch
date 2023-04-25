const lexical = require("./lexical");
const gen_dfa = require("./gen_DFA");
const path = require("path");
const regexpTree = require("regexp-tree");
const assert = require("assert");

const a2z = "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z";
const A2Z = "A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z";
const r0to9 = "0|1|2|3|4|5|6|7|8|9";
const alphanum = `${a2z}|${A2Z}|${r0to9}`;

const key_chars = `(${a2z})`;
// hypothesis: is key_chars in email only limit to these chars below?
const succ_key_chars = "(v|a|c|d|s|t|h)";
const catch_all =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|\\/|:|;|<|=|>|\\?|@|\\[|\\\\|]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";
// Not the same: \\[ and ]
const catch_all_without_semicolon =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|\\/|:|<|=|>|\\?|@|\\[|\\\\|]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";

const email_chars = `${alphanum}|_|.|-`;
const base_64 = `(${alphanum}|\\+|\\/|=)`;
const word_char = `(${alphanum}|_)`;
const a2z_nosep = "abcdefghijklmnopqrstuvwxyz";
const A2Z_nosep = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const r0to9_nosep = "0123456789";
const email_address_regex = `([a-zA-Z0-9._%\\+-]+@[a-zA-Z0-9.-]+.[a-zA-Z0-9]+)`;

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
// text is basically the naive regex
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
  } // New: simplifyRegex
  var ast = lexical.parseRegex(gen_dfa.simplifyRegex(text)),
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
          if (!alp_dict.hasOwnProperty(transition[i][1])) {
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
        if (!transition_3.hasOwnProperty(states_id)) {
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
    // var edges = m1.edges;
    if (m1.type == "accept") {
      accepted.push(m1.id);
      return;
    }
    for (let i = 0; i < m1.edges.length; i++) {
      // console.log("edge of ", m1.id, " : ", m1.edges[i][0]);
      if (!tran.hasOwnProperty(m1.id)) {
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
        if (!q4.hasOwnProperty(key)) {
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
        if (!all_trans.hasOwnProperty(p)) {
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
  // console.log("trannnn ", all_trans);
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

// Recursive Version: Stack overflow with huge OR statement like `${a2z}|${A2Z}|${r0to9}`
// function findMatchStateM4(m4) {
//   var tranGraph = m4["tran"];
//   var allTags = {};
//   var visited_tran = new Set();
//   var num_outward = {};
//   var track_outward = {};
//   for (const key in tranGraph) {
//     num_outward[key] = Object.keys(tranGraph[key]).length;
//     track_outward[key] = 0;
//   }
//   // change if many accepted states
//   num_outward[m4["accepted"]] = 0;
//   track_outward[m4["accepted"]] = 0;

//   function findMatchState(node_id, memTags, boolTags) {
//     if (track_outward[node_id] == num_outward[node_id]) {
//       for (const key in memTags) {
//         if (!allTags.hasOwnProperty(key)) {
//           allTags[key] = new Set();
//         }
//         for (const strTran of memTags[key]) {
//           allTags[key].add(strTran);
//         }
//       }
//       return;
//     }

//     for (const key in tranGraph[node_id]) {
//       // if already visit that transition, skip it
//       if (
//         visited_tran.has(JSON.stringify([node_id, tranGraph[node_id][key][0]]))
//       ) {
//         continue;
//       }
//       // if not add this visit in
//       visited_tran.add(JSON.stringify([node_id, tranGraph[node_id][key][0]]));
//       track_outward[node_id] += 1;
//       var cl_memTags = {};
//       for (const key in memTags) {
//         cl_memTags[key] = new Set(memTags[key]);
//       }
//       // console.log("check ", node_id, cl_memTags);
//       var cl_boolTags = Object.assign({}, boolTags);
//       var tags = tranGraph[node_id][key][1];
//       if (tags.length > 0) {
//         for (const tag of tags) {
//           var split_tag = tag.split(",");
//           if (split_tag[0] == "E") {
//             cl_boolTags[split_tag[1]] = false;
//           } else {
//             cl_boolTags[split_tag[1]] = true;
//           }
//         }
//       }
//       for (const boolTag in cl_boolTags) {
//         if (cl_boolTags[boolTag]) {
//           if (!cl_memTags.hasOwnProperty(boolTag)) {
//             cl_memTags[boolTag] = new Set();
//           }
//           cl_memTags[boolTag].add(
//             JSON.stringify([node_id, tranGraph[node_id][key][0]])
//           );
//         }
//       }
//       findMatchState(tranGraph[node_id][key][0], cl_memTags, cl_boolTags);
//     }
//   }
//   findMatchState(m4["start"], {}, {});
//   return allTags;
// }

// Non recursive version
function findMatchStateM4(m4) {
  var tranGraph = m4["tran"];
  var allTags = {};
  var visited_tran = new Set();
  var num_outward = {};
  var track_outward = {};
  for (const key in tranGraph) {
    num_outward[key] = Object.keys(tranGraph[key]).length;
    track_outward[key] = 0;
  }
  // change if many accepted states
  num_outward[m4["accepted"]] = 0;
  track_outward[m4["accepted"]] = 0;

  var stack = [];
  stack.push({ node_id: m4["start"], memTags: {}, boolTags: {} });

  while (stack.length > 0) {
    var { node_id, memTags, boolTags } = stack.pop();

    if (track_outward[node_id] == num_outward[node_id]) {
      for (const key in memTags) {
        if (!allTags.hasOwnProperty(key)) {
          allTags[key] = new Set();
        }
        for (const strTran of memTags[key]) {
          allTags[key].add(strTran);
        }
      }
      continue;
    }

    for (const key in tranGraph[node_id]) {
      // if already visit that transition, skip it
      if (
        visited_tran.has(JSON.stringify([node_id, tranGraph[node_id][key][0]]))
      ) {
        continue;
      }
      // if not add this visit in
      visited_tran.add(JSON.stringify([node_id, tranGraph[node_id][key][0]]));
      track_outward[node_id] += 1;
      var cl_memTags = {};
      for (const key in memTags) {
        cl_memTags[key] = new Set(memTags[key]);
      }
      // console.log("check ", node_id, cl_memTags);
      var cl_boolTags = Object.assign({}, boolTags);
      var tags = tranGraph[node_id][key][1];
      if (tags.length > 0) {
        for (const tag of tags) {
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
          if (!cl_memTags.hasOwnProperty(boolTag)) {
            cl_memTags[boolTag] = new Set();
          }
          cl_memTags[boolTag].add(
            JSON.stringify([node_id, tranGraph[node_id][key][0]])
          );
        }
      }
      stack.push({
        node_id: tranGraph[node_id][key][0],
        memTags: cl_memTags,
        boolTags: cl_boolTags,
      });
    }
  }

  return allTags;
}

function regexSubmatch(text, m3, m4) {
  var q3_rev_mem = [m3["start_state"]];
  var node = m3["start_state"];
  // run through m3
  for (let i = text.length - 1; i >= 0; i--) {
    if (
      m3["trans"].hasOwnProperty(node) &&
      m3["trans"][node].hasOwnProperty(text[i])
    ) {
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
    if (!tag_result.hasOwnProperty(key.split(",")[1])) {
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
    if (
      m3["trans"].hasOwnProperty(node) &&
      m3["trans"][node].hasOwnProperty(text[i])
    ) {
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
  checkBeginGroup,
  checkEndGroup,
  regexToM1,
  M1ToM2,
  M2ToM3,
  createM4,
  SimulateM1,
  regexSubmatch,
  findMatchStateM4,
  regexSubmatchFromState,
};
