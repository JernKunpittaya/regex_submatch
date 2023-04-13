const lexical = require("./lexical");
// let regex = "a(b|c)+d";
function readM1(m1, mem) {
  if (mem.includes(m1)) {
    console.log("exist already", m1);
    return;
  } else {
    mem.push(m1);
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
console.log(readM1(M1, []));
//
