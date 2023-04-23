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

let regex = "((a*)|b)(ab|b)";
// let regex = "((a*)|cb)*kb";
let submatches = [
  [0, 7],
  [1, 4],
  [8, 13],
];
// let submatches = [
//   [1, 4],
//   // [1, 4],
//   // [9, 17],
// ];
console.log("parsed: ", lexical.parseRegex(regex));
// console.log("parsed: ", lexical.parseRegex(regex)["parts][0]["parts"]);
console.log("detail");
var M1 = lexical.regexToM1(regex, submatches);
var M1_easy = lexical.SimulateM1(M1);
console.log("M1_easy", M1_easy);
var M2_dict = lexical.M1ToM2(M1);
// console.log("M2: ", M2_dict);
// // for (let key in M2_dict["q2"]) {
// //   console.log(readM1(M2_dict["q2"][key]));
// // }
var M3_dict = lexical.M2ToM3(M2_dict["q2"], M2_dict["trans"]);
console.log("M3 ", M3_dict);

var M4_dict = lexical.createM4(M1, M3_dict);
console.log("M4", M4_dict);
var text = "aaaab";
var tag_result = lexical.regexSubmatch(text, M3_dict, M4_dict);
console.log("tag result ", tag_result);
console.log("all matched states; ", lexical.findMatchStateM4(M4_dict));
//
