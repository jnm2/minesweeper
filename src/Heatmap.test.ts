import { test } from 'uvu';
import { expect } from 'chai';
import { Map, Heatmap } from './Heatmap';

test('validates constraints before starting', () => {
    const map = new Map([
        [2, 'flag', undefined],
        ['flag', 'flag', 2],
    ]);

    expect(map.validateAll(3)).to.equal(false);

    const heatmap = Heatmap.compute({ map, mineCount: 3 });
    expect(heatmap.getBombLikelihood(0, 2)).to.be.undefined;
});

test('validates flags against bomb count before starting', () => {
    // Otherwise, the heatmap shows negative values (blue tint).
    const map = new Map([
        ['flag', 'flag', undefined],
    ]);

    expect(map.validateAll(1)).to.equal(false);

    const heatmap = Heatmap.compute({ map, mineCount: 1 });
    expect(heatmap.getBombLikelihood(0, 2)).to.be.undefined;
});

test.run();
