let turns = 10;

let tokens = 400;

let sessions = 19;

let in_cost = 2 / 1000000;
let ca_cost = 0.5 / 1000000;
let out_cost = 8 / 1000000;

let turn_tokens = tokens / turns;
let in_turn_tokens = turn_tokens / 4;
let out_turn_tokens = turn_tokens - turn_tokens / 4;

let cache = 0;
let cost = 0;

for (let i = 0; i < turns; i++) {
  let a = in_turn_tokens * in_cost;
  let b = out_turn_tokens * out_cost;
  let c = cache * ca_cost;

  cache += in_turn_tokens + out_turn_tokens;
  cost += a + b + c;
}

console.log(`\nCost / Session:    $ ${cost}\n`);
console.log(`Total Cost:        $ ${cost * sessions}\n`);
