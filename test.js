const lexical = require("./lexical");
// let regex = "a(b|c)+d";
function readM1(m1, layer, mem) {
  if (mem.includes(m1)) {
    console.log("exist already", m1);
    return;
  } else {
    mem.push(m1);
  }
  console.log("layer: ", layer);
  console.log(m1);

  for (let i = 0; i < m1.edges.length; i++) {
    console.log("edge of id ", m1.id, " : ", m1.edges[i][0]);
    readM1(m1.edges[i][1], layer + 1, mem);
  }
}

let regex = "ab*";
console.log("parsed: ", lexical.parseRegex(regex));
console.log("machine: ", lexical.regexToM1(regex));
console.log("detail");
console.log(readM1(lexical.regexToM1(regex), 0, []));