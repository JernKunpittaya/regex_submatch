const fs = require("fs");
const gen = require("./gen");
const gen_dfa = require("./gen_DFA");
const lexical = require("./lexical");
// let regex = "a(b|c)+d";
function readM1(m1, mem = new Set()) {
  if (mem.has(m1)) {
    console.log("exist already", m1);
    return;
  } else {
    mem.add(m1);
  }
  console.log(m1);

  for (let i = 0; i < m1.edges.length; i++) {
    console.log("edge of ", m1.id, " : ", m1.edges[i][0]);
    readM1(m1.edges[i][1], mem);
  }
}
//example
// let regex = "((a*)|b)(ab|b)";
// let submatches = [
//   [0, 7],
//   [1, 4],
//   [8, 13],
// ];
// const text = "aaaab";
const a2z = "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z";
const a2b = "a|b";
const a2f = "a|b|c|d|e|f";
const A2Z = "A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z";
const r0to9 = "0|1|2|3|4|5|6|7|8|9";
const alphanum = `${a2z}|${A2Z}|${r0to9}`;
const alphabet = `${a2z}|${A2Z}|0|1|2`;
const catch_all =
  "(0|1|2|3|4|5|6|7|8|9|a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z|!|\"|#|$|%|&|'|\\(|\\)|\\*|\\+|,|-|.|\\/|:|;|<|=|>|\\?|@|\\[|\\\\|]|^|_|`|{|\\||}|~| |\t|\n|\r|\x0b|\x0c)";

let regex = `Name: ((${alphanum})+)\n`;
let submatches = [[6, 133]];
const text = fs.readFileSync("./email_wallet.txt").toString();
console.log("rege ", regex);
console.log("reg len: ", regex.length);
const simp_graph = gen_dfa.simplifyGraph(regex);
console.log("simp_graph jaa ", simp_graph["states"].length);
console.log("detail");
var M1 = gen.regexToM1(regex, submatches);
var M1_easy = gen.SimulateM1(M1);
// console.log("M1_easy", M1_easy);
console.log("M1 num states", M1_easy["q1"].size);
var M2_dict = gen.M1ToM2(M1);
// console.log("M2: ", M2_dict);
console.log("M2 num states: ", Object.keys(M2_dict["q2"]).length);
// // for (let key in M2_dict["q2"]) {
// //   console.log(readM1(M2_dict["q2"][key]));
// // }
var M3_dict = gen.M2ToM3(M2_dict["q2"], M2_dict["trans"]);
// console.log("M3 ", M3_dict)
console.log("M3 num states ", Object.keys(M3_dict["trans"]).length);

var M4_dict = gen.createM4(M1, M3_dict);
// console.log("M4", M4_dict);

const matched_dfa = gen_dfa.findSubstrings(simp_graph, text);
// console.log("matched DFA: ", matched_dfa);
// for (const subs of matched_dfa[1]) {
//   // console.log("subbbs ", subs);
//   var matched = text.slice(subs[0], subs[1] + 1);
//   var tag_result = gen.regexSubmatch(matched, M3_dict, M4_dict);
//   // console.log(tag_result[]);
//   console.log(
//     "extracted: ",
//     matched.slice(tag_result["0"][0], tag_result["0"][1] + 1)
//   );
// }
// console.log("M4_dict: ", M4_dict);
console.log("M4 num state: ", Object.keys(M4_dict["tran"]).length);
console.log("all matched states; ", gen.findMatchStateM4(M4_dict));
for (const subs of matched_dfa[1]) {
  var matched = text.slice(subs[0], subs[1] + 1);
  var tag_result = gen.regexSubmatchFromState(matched, M3_dict, M4_dict);
  var result = "";
  for (const index of tag_result["0"]) {
    result += matched[index];
  }
  console.log("Another tag: ", result);
}
