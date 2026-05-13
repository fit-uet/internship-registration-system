import { parse } from 'csv-parse/sync';

async function run() {
  const fetchUrl = 'https://docs.google.com/spreadsheets/d/1VVH_O6glb3e9ugXa7SZcm0JuSNxm9NtarHRKubwJeY4/export?format=csv';
  const response = await fetch(fetchUrl);
  const csvData = await response.text();
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });
  console.log('Columns: ', Object.keys(records[0]));
  console.log('First Record: ', records[0]);
}

run().catch(console.error);
