import { test, expect } from 'vitest';
import { repo } from '../zetaRepo';
import { locationManager } from '../location';

test('location manager basic flow', async () => {
  // ensure repo exists
  await repo.init();
  // create a card and commit
  const manifest = JSON.stringify({ id: 'test.card', title: 'Test Card', semanticDescriptor: 'test card' });
  const res = await repo.addCardAndCommit('cards/test/manifest.json', manifest, 'refs/heads/main', 'add test card');
  // init location manager
  await locationManager.init();
  const h = await locationManager.here();
  expect(h.commit).toBeTruthy();

  // move to the commit we just created
  await locationManager.move(res.commitOid);
  const h2 = await locationManager.here();
  expect(h2.commit).toBe(res.commitOid);

  // descend into path
  locationManager.descend('cards/test');
  const h3 = await locationManager.here();
  expect(h3.path).toContain('cards/test');

  // ascend back
  locationManager.ascend();
  const h4 = await locationManager.here();
  expect(h4.path === '/' || !h4.path.includes('cards/test')).toBeTruthy();
});
