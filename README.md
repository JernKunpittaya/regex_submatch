# regex_submatch

Want to create this repo to unveil behind the scenes of regex matching stuff so we can use it to create zk circuit in the future.
We create 2 automata m3, m4 to parse and extract submatches.

We make it accept only sound group match e.g. (a*) not (a)*
Thi is the generalized version of subgroup matching, but it's exponential size so will simplify it in next repo. The register version is done, but stop working on the state version --> go back to simplify DFA

To write
-why 2 automata
-why m3 is reversed dfa
-why m4 is built that way
-how to make it compatible with circom
-example
-swap comment json.stringify 2 places to show readable M4

Note: Cant match , and \

Inspiration: https://www.labs.hpe.com/techreports/2012/HPL-2012-41R1.pdf
