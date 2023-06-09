const lexical = require("./lexical");
const gen_dfa = require("./gen_DFA");
const path = require("path");
const regexpTree = require("regexp-tree");
const assert = require("assert");
const { group } = require("console");

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

// Assume submatch already given by order of (
// check if we should put submatch start "S" tag on that index or not
function checkBeginGroup(index, submatches) {
  let result = [];
  for (let i = 0; i < submatches.length; i++) {
    for (let j = 0; j < submatches[i].length; j++) {
      if (submatches[i][j][0] == index) {
        // result.push(i);
        result.push(JSON.stringify([i, j]));
        break;
      }
    }
  }
  if (result.length != 0) {
    return result;
  }
  return false;
}
// reverse order
// check if we should put submatch end "E" tag on that index or not
function checkEndGroup(index, submatches) {
  let result = [];
  for (let i = submatches.length - 1; i >= 0; i--) {
    // new
    for (let j = 0; j < submatches[i].length; j++) {
      //
      if (submatches[i][j][1] == index) {
        // result.push(i);
        result.push(JSON.stringify([i, j]));
        break;
      }
      //
    }
    //
  }
  if (result.length != 0) {
    return result;
  }
  return false;
}

// M1 region

// create M1 from regex
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
    // console.log("beginninggg");
    // console.log("Node id ", node);
    // console.log("start state b4: ", start);
    // console.log("end state b4: ", end);
    // console.log("count: ", count);
    // console.log("submatch: ", submatches);
    // console.log("memS: ", memS);
    // console.log("memE: ", memE);
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
        // WHY memS and memE --> not repeat tag with group that overlaps in node.begin, node.end
        if (!memS.includes(beginTag[i])) {
          memS.push(beginTag[i]);
          last = { type: "", edges: [] };
          // temp.edges.push([["S", beginTag[i]], last]);
          temp.edges.push([["S", JSON.parse(beginTag[i])[0]], last]);
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
        // WHY memS and memE
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
          // temp.edges.push([["E", newTag[i]], last]);
          temp.edges.push([["E", JSON.parse(newTag[i])[0]], last]);
          temp = last;
        }
        memE.push(newTag[newTag.length - 1]);
        // last.edges.push([["E", newTag[newTag.length - 1]], end]);
        last.edges.push([["E", JSON.parse(newTag[newTag.length - 1])[0]], end]);
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
    // console.log("start state after: ", start);
    // console.log("end state after: ", end);
    return [count, end];
  }

  // New: simplifyRegex and simplify Plus
  var after_plus = gen_dfa.simplifyPlus(
    gen_dfa.simplifyRegex(text),
    submatches
  );

  // console.log("afterrr; ", after_plus["submatches"]);
  var ast = lexical.parseRegex(after_plus["regex"]),
    start = { type: "start", edges: [] },
    accept = { type: "accept", edges: [] };
  // console.log("Before plus: ", gen_dfa.simplifyRegex(text));
  // console.log("Plus works: ", after_plus["regex"]);
  // console.log("submatchh: ", submatches);
  if (typeof ast === "string") {
    return ast;
  }
  // console.log("ast: ", ast);
  // console.log("part 5: ", ast["parts"][5]);
  // console.log("part 5 OR: ", ast["parts"][5]["parts"][0]);
  // console.log("part 5 STAR: ", ast["parts"][5]["parts"][1]);
  // console.log("part 5 OR in STAR: ", ast["parts"][5]["parts"][1]["sub"]);
  // use new submatches as after_plus["submatches"] instead
  // console.log("ssss: ",after_plus["submatches"] )
  generateGraph(ast, start, accept, 0, after_plus["final_submatches"], [], []);
  return start;
}
// simplify M1 to readable format, not just node points to each other
function simplifyM1(m1) {
  function read_M1(m1, q1, trans, accepted) {
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
      if (!trans.hasOwnProperty(m1.id)) {
        trans[m1.id] = {};
      }
      trans[m1.id][m1.edges[i][0].toString()] = m1.edges[i][1].id.toString();
      read_M1(m1.edges[i][1], q1, trans, accepted);
    }
  }
  var q1 = new Set();
  var trans = {};
  var accepted = [];
  read_M1(m1, q1, trans, accepted);
  return { q1: q1, accepted: accepted, trans: trans };
}

// M2 Region
// Find the states in M1 that have outgoing edge with alphabet, to use as states in M2
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
// Check if pi(start,end) is defined or not
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
// get all transition for M2
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
//Create M2 from M1
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
// can also read original m1 before getting simplified by simplifyM1
function readM2(m2, mem = new Set()) {
  if (mem.has(m2)) {
    console.log("exist already", m2);
    return;
  } else {
    mem.add(m2);
  }
  console.log(m2);

  for (let i = 0; i < m2.edges.length; i++) {
    console.log("edge of ", m2.id, " : ", m2.edges[i][0]);
    readM2(m2.edges[i][1], mem);
  }
}

// M3 region
// create M3 from M2
function M2ToM3(m2) {
  var q2_m2 = m2["q2"];
  var transition = m2["trans"];
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

// M4 region
// Find all paths without alphabet between start_id and end_id in m1
function findAllPathsBetw(simplified_m1, start_id, end_id) {
  const visited = new Set();
  const paths = [];

  function dfs(node_id, path, tran) {
    if (node_id === end_id) {
      paths.push({ path: path, tran: tran });
      return;
    }

    visited.add(node_id);

    for (const key in simplified_m1["trans"][node_id]) {
      if (
        key.split(",").length > 1 &&
        !visited.has(simplified_m1["trans"][node_id][key])
      ) {
        // console.log(
        //   "from ",
        //   node_id,
        //   " with ",
        //   key,
        //   " to ",
        //   simplified_m1["trans"][node_id][key]
        // );
        // console.log("one here: ", [...path, simplified_m1["trans"][node_id][key]]);
        // console.log("second here ", [...tran, key]);
        dfs(
          simplified_m1["trans"][node_id][key],
          [...path, simplified_m1["trans"][node_id][key]],
          [...tran, key]
        );
      }
    }

    visited.delete(node_id);
  }

  dfs(start_id, [start_id], []);

  return paths;
}
// compare priority of transition
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
// get max index
const maxIndex = (arr, comparator) => {
  let maxIndex = 0;
  for (let i = 1; i < arr.length; i++) {
    if (comparator(arr[i], arr[maxIndex]) == 1) {
      maxIndex = i;
    }
  }
  return maxIndex;
};
// extract only tag from transition array
function onlyTag(arr) {
  result = [];
  for (const ele of arr) {
    if (ele.split(",")[0] != "ϵ") {
      result.push(ele);
    }
  }
  return result;
}
// create m4
function createM4(m1, m3) {
  var simplified_m1 = simplifyM1(m1);
  var q4 = {};
  // q4 = {state: {b: next, a: next}, ...}
  for (let key in simplified_m1["trans"]) {
    for (let alp in simplified_m1["trans"][key]) {
      if (alp.split(",").length == 1) {
        if (!q4.hasOwnProperty(key)) {
          q4[key] = {};
        }
        q4[key][alp] = simplified_m1["trans"][key][alp];
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
          var search = findAllPathsBetw(simplified_m1, q4[p][key], state);
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
          // PRINT swap comments betw 2 lines below
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
      var search = findAllPathsBetw(simplified_m1, "0", state);
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
          // PRINT swap comments betw 2 lines below
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
  // PRINT uncomment below lines
  // console.log("M4 transitions: ", all_trans);
  // console.log("acce M4 ", simplified_m1["accepted"]);
  return {
    q4: q4_withAcc,
    start: "start",
    // accepted: simplified_m1["accepted"].toString(),
    accepted: simplified_m1["accepted"].toString(),
    trans: all_trans,
  };
}
// Change from paper that cares only latest one, to be everyone to cover cases like "DKI: ([vad]; )+bh"
// extract index range (not end inclusive) for each subgroup
// text is the input text we're reading
function regexSubmatchRegister(text, m3, m4) {
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
    if (m4["trans"][node][q3_rev_mem[text.length - i]][1].length > 0) {
      // console.log(i, " : ", m4["trans"][node][q3_rev_mem[text.length - i]][1]);
      for (const tag of m4["trans"][node][q3_rev_mem[text.length - i]][1]) {
        // console.log("tag: ", tag);
        // New
        if (!submatch.hasOwnProperty(tag)) {
          submatch[tag] = [];
        }

        submatch[tag].push(i);
      }
    }
    node = m4["trans"][node][q3_rev_mem[text.length - i]][0];
    // console.log("node", node);
  }
  // console.log("subbbb ", submatch);
  tag_result = {};
  // console.log("num tag: ", Object.keys(submatch).length / 2);
  for (var i = 0; i < Object.keys(submatch).length / 2; i++) {
    const startTag = "S," + i;
    const endTag = "E," + i;
    tag_result[i] = [];
    for (var j = 0; j < submatch[startTag].length; j++) {
      tag_result[i].push([submatch[startTag][j], submatch[endTag][j]]);
    }
  }
  // console.log("tag result ", tag_result);
  return tag_result;
}

// Extract regex from register
function finalRegexExtractRegister(regex, submatches, text) {
  const simp_graph = gen_dfa.simplifyGraph(regex);
  // console.log("simp graph DFA: ", simp_graph);
  console.log("min_dfa num states: ", simp_graph["states"].length);
  // console.log("input regex: ", regex);
  const M1 = regexToM1(regex, submatches);
  const M1_simplified = simplifyM1(M1);
  // console.log("simp M1: ", M1_simplified);
  console.log("M1 num states: ", M1_simplified["q1"].size);
  const M2_dict = M1ToM2(M1);
  console.log("M2 num states: ", Object.keys(M2_dict["q2"]).length);
  const M3_dict = M2ToM3(M2_dict);
  console.log("M3 num states ", Object.keys(M3_dict["trans"]).length);
  const M4_dict = createM4(M1, M3_dict);
  console.log("M4 num state: ", Object.keys(M4_dict["trans"]).length);
  // console.log("M4: ", M4_dict);
  const matched_dfa = gen_dfa.findSubstrings(simp_graph, text);
  // console.log("matched df ", matched_dfa);
  //iterate tag
  for (const subs of matched_dfa[1]) {
    var matched = text.slice(subs[0], subs[1] + 1);
    var tag_result = regexSubmatchRegister(matched, M3_dict, M4_dict);
    // console.log("All tags: ", tag_result);
    // console.log("Matched: ", matched);
    for (index in tag_result) {
      for (var i = 0; i < tag_result[index].length; i++) {
        console.log(
          "Group: ",
          index,
          " : ",
          matched.slice(tag_result[index][i][0], tag_result[index][i][1])
        );
      }
    }
  }
}
function readSubmatch(regex, submatches) {
  regex = gen_dfa.simplifyRegex(regex);
  // console.log("og regex: ", regex);
  var after_plus = gen_dfa.simplifyPlus(regex, submatches);
  // console.log("after plus: ", after_plus);
  // var final_regex = after_plus["regex"];
  // var final_submatches = after_plus["submatches"];
  var final_regex = after_plus["regex_show"];
  var final_submatches = after_plus["final_submatches"];
  // console.log("og submatch: ", submatches);
  // console.log("after submatch: ", final_submatches);

  console.log("len regex: ", regex.length);
  const index_color = {};
  const index_full = {};
  const color_arr = [];
  const defaultColor = "\x1b[0m";

  // color of original regex
  for (var i = 0; i < submatches.length; i++) {
    // the actual index of left is leftmost, right is rightmost
    const color = `\x1b[${(i % 7) + 31}m`;
    index_color[submatches[i][0]] = color;
    index_color[submatches[i][1]] = color;
    color_arr.push(color);
  }
  const sortedIndex = Object.keys(index_color).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });
  var result = "";
  var prev = 0;
  for (const index of sortedIndex) {
    result += regex.slice(prev, parseInt(index)) + index_color[index];
    result += regex[index] + defaultColor;
    prev = parseInt(index) + 1;
  }
  result += regex.slice(prev);

  // color of final regex
  for (var i = 0; i < final_submatches.length; i++) {
    // the actual index of left is leftmost, right is rightmost
    const color = `\x1b[${(i % 7) + 31}m`;
    for (var match of final_submatches[i]) {
      index_full[match[0]] = color;
      index_full[match[1]] = color;
    }
  }
  const final_sortedIndex = Object.keys(index_full).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });
  var final_result = "";
  var final_prev = 0;
  for (const index of final_sortedIndex) {
    final_result +=
      final_regex.slice(final_prev, parseInt(index)) + index_full[index];
    final_result += final_regex[index] + defaultColor;
    final_prev = parseInt(index) + 1;
  }
  final_result += final_regex.slice(final_prev);

  // group color
  var group_color = "Group: ";
  for (var i = 0; i < color_arr.length; i++) {
    group_color += color_arr[i] + i + defaultColor + ", ";
  }
  console.log(group_color.slice(0, group_color.length - 2));
  console.log("input regex: ", result);
  console.log("final regex: ", final_result);
}

// function
module.exports = {
  finalRegexExtractRegister,
  readSubmatch,
};
