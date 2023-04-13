const lexical = require("./lexical");
let regex = "a(b|c)+d";
console.log(lexical.parseRegex(regex));
