import assert from 'node:assert';
import { buildSupportParams, pickSupportResults } from '../src/lib/support.js';

const params = (query) => new URLSearchParams(query);

describe('buildSupportParams', () => {
  it('builds the upstream query from q, limit and lang', () => {
    const out = buildSupportParams(params('q=laptop&limit=5&lang=de'));
    assert.equal(out.get('q'), 'laptop');
    assert.equal(out.get('resultLimit'), '5');
    assert.equal(out.get('languageCode'), 'de');
    assert.equal(out.get('store'), 'tmsstore');
  });

  it('rejects a missing or overlong query', () => {
    assert.equal(buildSupportParams(params('')), null);
    assert.equal(buildSupportParams(params('q=%20%20')), null);
    assert.equal(buildSupportParams(params(`q=${'a'.repeat(101)}`)), null);
  });

  it('clamps the limit and falls back on a bad language', () => {
    assert.equal(buildSupportParams(params('q=ink&limit=500')).get('resultLimit'), '24');
    assert.equal(buildSupportParams(params('q=ink&limit=-3')).get('resultLimit'), '1');
    assert.equal(buildSupportParams(params('q=ink')).get('resultLimit'), '3');
    assert.equal(buildSupportParams(params('q=ink&lang=english')).get('languageCode'), 'en');
  });
});

describe('pickSupportResults', () => {
  it('keeps only the fields the site uses', () => {
    const body = JSON.stringify({
      status: 'success',
      results: [{
        productid: '1', productname: 'HP ZBook', seofriendlyname: 'hp-zbook', internal: 'x',
      }],
    });
    assert.deepEqual(pickSupportResults(body), {
      results: [{ productid: '1', productname: 'HP ZBook', seofriendlyname: 'hp-zbook' }],
    });
  });

  it('returns no results for an empty or broken body', () => {
    assert.deepEqual(pickSupportResults(''), { results: [] });
    assert.deepEqual(pickSupportResults('<html>oops</html>'), { results: [] });
  });
});
