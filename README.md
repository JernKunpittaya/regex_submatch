# regex_submatch

A repo of backend algorithm to extract regex matching in the most general and granular case. Hence resulting in exponential blowup. To make it linear to work with zk, we simplify the generalization of subgroup match allowance to not allow reveal only "a" from (a|b) [not revealing anything if it matches b, which this repo allows us to do this] but to reveal "a" or "b" from a|b. [Hence reveal anyway either it matches a or b]. See more at https://github.com/JernKunpittaya/full_zk_regex

Want to create this repo to unveil behind the scenes of regex matching stuff so we can use it to create zk circuit in the future.
We create 2 automata m3, m4 to parse and extract submatches.

We make it accept only sound group match e.g. (a*) not (a)*
Thi is the generalized version of subgroup matching, but it's exponential size so will simplify it in https://github.com/JernKunpittaya/frontend_zk_regex. The register version is done, but stop working on the state version --> go back to simplify DFA

Key concepts

- We create 4 state matchines: M1, M2, M3, M4. We use only M3 and M4 to run on input text to extract a certain subgroup we're interested in.
- M1 is just an NFA with tagged index to append before and after the subgroup we're interested in.
- M2 is just reduced version of M1 for creating reverse state machine to run backwards.
- M3 is a reverse DFA that is used to run input backwards and store the state that each input lands into.
- M4 uses input as states of each input alphabet from M3 to distinguish cases like (ab)+c and (ab)+d

Note:
-This implementation is exponentially large since we make it very very general to extract any subgroup. For example, regex: (hey(ab)+|hello), in this implementation we can literally just extract (ab)+ part. We can reduce complexity of this algorithm by allowing less granular submatch like in this case, only extract either hey(ab)+ OR hello, nothing more granular.
-To read M4, we can swap comment json.stringify in 2 places.

Inspiration: https://www.labs.hpe.com/techreports/2012/HPL-2012-41R1.pdf
