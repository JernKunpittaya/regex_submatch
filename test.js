const fs = require("fs");
const gen = require("./gen");
const gen_dfa = require("./gen_DFA");
const lexical = require("./lexical");

//example1
// let regex = "((a*)|b)(ab|b)";
// let submatches = [
//   [0, 7],
//   [1, 4],
//   [8, 13],
// ];
// const text = "aaaab";

//example2
// let regex = `Name: ((${alphanum})+)\n`;
// let submatches = [[6, 133]];
// const text ="Name: daJob
// Name: hasdlfIE3
// Name: acbb

// Name: Love you
// Name: cbaba asd
// "
const a2z = "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z";
const a2b = "a|b";
const a2f = "a|b|c|d|e|f";
const A2Z = "A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z";
const r0to9 = "0|1|2|3|4|5|6|7|8|9";
const alphanum = `${a2z}|${A2Z}|${r0to9}`;
const alphabet = `${a2z}|${A2Z}|0|1|2`;

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

const email_wallet_text = fs.readFileSync("./email_wallet.txt").toString();
const text = fs.readFileSync("./test.txt").toString();
// const sig_regex = `\nDKIM-Signature: (${key_chars}=${catch_all_without_semicolon}+;( |\t|\n|\r|\x0b|\x0c)*)+ bh=${base_64}+;`;
// const sig_regex = `\nDKIM-Signature: (${succ_key_chars}=${catch_all_without_semicolon}+;( |\t|\n|\r|\x0b|\x0c)*)+ bh`;
// const submatches = [
//   [18, 32],
//   [34, 240],
// ];
// const regex = `DKI: ((v|a|d); )+bh`;
const regex = "DKI: ([vad]; )+bh";
const submatches = [
  [6, 12],
  [17, 23],
];
gen.readSubmatch(regex, submatches);
gen.finalRegexExtractRegister(regex, submatches, text);
// gen.finalRegexExtractState(sig_regex, submatches, email_wallet_text);
