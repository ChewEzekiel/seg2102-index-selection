// A5: reproduce Table 2 of Espona et al. (2023) with mongodb-auto-index.
const fs = require('fs');
const path = require('path');
const AutoIndex = require('mongodb-auto-index/source/autoindex');

const ROOT = path.join(__dirname, '..');
const SETS = {
  'S2-pqe': 'workloads/espona/s2/pqe',
  'S2-tpch': 'workloads/espona/s2/tpch',
  'S3-pqe': 'workloads/espona/s3/pqe',
  'S3-tpch': 'workloads/espona/s3/tpch',
};

// Table 2 of the paper: "collection {index key}".
const EXPECTED = {
  'S2-pqe': ['customer {"c_acctbal":1}', 'lineitem {"_id.l_orderkey":1}', 'orders {"o_custkey":1}'],
  'S2-tpch': ['customer {"c_acctbal":1}', 'customer {"c_mktsegment":1}', 'orders {"o_custkey":1}',
    'orders {"o_orderdate":1}', 'lineitem {"_id.l_orderkey":1}', 'lineitem {"l_shipdate":1}'],
  'S3-pqe': ['orders-lineitem {"o_custkey":1}'],
  'S3-tpch': ['customer {"c_acctbal":1}', 'customer {"c_mktsegment":1}',
    'orders-lineitem {"o_custkey":1}', 'orders-lineitem {"o_orderdate":1}'],
};

const OUT = path.join(ROOT, 'results', 'raw', 'a5_generator');
fs.mkdirSync(OUT, { recursive: true });

let allMatch = true;
for (const [set, dir] of Object.entries(SETS)) {
  for (const minimize of [false, true]) {
    const indexes = new AutoIndex().autoindex(path.join(ROOT, dir), null, minimize, false);
    const found = indexes.map(i => `${i.collection} ${JSON.stringify(i.key)}`).sort();
    const file = path.join(OUT, `${set}_minimize-${minimize}.json`);
    fs.writeFileSync(file, JSON.stringify(indexes.map(i => i.toMongoJSON()), null, 2));

    const expected = [...EXPECTED[set]].sort();
    const missing = expected.filter(e => !found.includes(e));
    const extra = found.filter(f => !expected.includes(f));
    const ok = missing.length === 0 && extra.length === 0;
    allMatch = allMatch && ok;

    console.log(`\n${set}  minimize=${minimize}  ${found.length} indexes  ${ok ? 'MATCHES Table 2' : 'DIFFERS'}`);
    found.forEach(f => console.log('   ' + f));
    if (!ok) console.log('   missing:', missing, ' extra:', extra);
  }
}

console.log(allMatch ? '\nAll sets match Table 2.' : '\nSome sets differ: explain each difference in the Methodology.');
process.exitCode = allMatch ? 0 : 1;