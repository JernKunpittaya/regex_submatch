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
let submatches = [
  [0, 7],
  [1, 4],
  [8, 13],
];
// let regex = "(ab|b)";
// let submatches = [[0, 5]];

console.log("parsed: ", lexical.parseRegex(regex));
console.log("detail");
var M1 = lexical.regexToM1(regex, submatches);
console.log(readM1(M1));

// var q2 = [];
// lexical.findQ2(M1, q2);
// console.log("q2 ", q2);
// var startQ2 = [];
// for (let i = 0; i < q2.length; i++) {
//   startQ2.push(lexical.piOnM1(M1, M1, q2[i]));
// }
// console.log("start: ", startQ2);
// var tran = lexical.deltaQ2(M1, q2);
// console.log("transition ", tran);
var M2 = lexical.M1ToM2(M1);
console.log("M2: ", M2);
for (let key in M2) {
  console.log(readM1(M2[key]));
}
//
