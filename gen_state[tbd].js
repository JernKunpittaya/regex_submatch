// previously in gen.js file, but not config yet so put it here for future work.
// show what state transition is included for revealing a subgroup match in all M4
// memTags {tag1: set("[from1, to1]","[from2, to2]"", ...), tag2: [...]}
// memTag {tag1: }
// boolTag{tag1: true, tag2: False}
function findMatchStateM4(m4) {
  var tranGraph = m4["trans"];
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

// return all indexes that is included in a certain subgroup match.
function regexSubmatchState(text, m3, m4) {
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
  // console.log("q3 array: ", q3_rev_mem);
  var allTags = findMatchStateM4(m4);
  console.log("all Tags fresh: ", allTags);
  console.log("num all tags", Object.keys(allTags));
  // console.log(allTags);
  var submatch = {};
  // run through m4
  node = "start";
  for (let i = 0; i <= text.length; i++) {
    for (const tag in allTags) {
      if (
        allTags[tag].has(
          JSON.stringify([
            node,
            m4["trans"][node][q3_rev_mem[text.length - i]][0],
          ])
        )
      ) {
        if (!(tag in submatch)) {
          submatch[tag] = new Set();
        }
        submatch[tag].add(i);
      }
    }
    node = m4["trans"][node][q3_rev_mem[text.length - i]][0];
  }

  return submatch;
}

// Extract regex from specified state
function finalRegexExtractState(regex, submatches, text) {
  const simp_graph = gen_dfa.simplifyGraph(regex);
  console.log("min_dfa num states: ", simp_graph["states"].length);
  const M1 = regexToM1(regex, submatches);
  const M1_simplified = simplifyM1(M1);
  console.log("M1 num states: ", M1_simplified["q1"].size);
  const M2_dict = M1ToM2(M1);
  console.log("M2 num states: ", Object.keys(M2_dict["q2"]).length);
  const M3_dict = M2ToM3(M2_dict);
  console.log("M3 num states ", Object.keys(M3_dict["trans"]).length);
  const M4_dict = createM4(M1, M3_dict);
  console.log("M4 num state: ", Object.keys(M4_dict["trans"]).length);
  const matched_dfa = gen_dfa.findSubstrings(simp_graph, text);
  console.log("matched dfa: ", matched_dfa);
  for (const subs of matched_dfa[1]) {
    var matched = text.slice(subs[0], subs[1] + 1);
    var tag_result = regexSubmatchState(matched, M3_dict, M4_dict);
    var result = "";
    console.log("taggg: ", tag_result);
    // iterate tag
    for (const index of tag_result["0"]) {
      result += matched[index];
    }
    console.log("State extracted: ", result);
  }
}
