const lexical = require("./lexical");
// let regex = "a(b|c)+d";
function readM1(m1, layer) {
  //   if (m1.edges.length <= 1) {
  //     return;
  //   }
  console.log("layer: ", layer);
  console.log(m1);

  for (let i = 0; i < m1.edges.length; i++) {
    console.log("edge of ", layer, " : ", m1.edges[i][0]);
    readM1(m1.edges[i][1], layer + 1);
  }
}

let regex = "aϵb";
console.log("parsed: ", lexical.parseRegex(regex));
console.log("machine: ", lexical.regexToM1(regex));
console.log("detail");
console.log(readM1(lexical.regexToM1(regex), 0));
