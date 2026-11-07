import test from 'node:test';
import assert from 'node:assert/strict';
import { SALARY_BANDS, PROBATION_SALARY, lookupSalary } from '../js/salaryBands.js';

test('LCB schedule follows the supplied image, including the 47 DV example', () => {
  assert.equal(PROBATION_SALARY, 4500000);
  const expected = [4700000,5200000,5700000,6200000,7000000,7800000,8600000,9400000,10300000,11200000,12100000,13000000,13900000,14800000,15700000,16700000,17700000,18700000,19700000,20700000,21900000,23100000,24300000,25500000,26700000,27900000,29400000,30900000,32400000,33900000,35400000,36900000,38900000];
  assert.deepEqual(SALARY_BANDS.map(b => b.salary), expected);
  for (const band of SALARY_BANDS) {
    assert.equal(lookupSalary(band.from).salary, band.salary);
    if (band.to !== Infinity) assert.equal(lookupSalary(band.to).salary, band.salary);
  }
  assert.equal(lookupSalary(47).salary, 7800000);
  assert.equal(lookupSalary(47).label, '46–50 INT');
  assert.equal(lookupSalary(200).salary, 38900000);
  assert.equal(lookupSalary(47, true).salary, 4500000);
  assert.equal(lookupSalary(-1), null); assert.equal(lookupSalary(NaN), null);
});
