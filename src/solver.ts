import { Game, UnknownCell, OpenCell } from './game';

export class Solver {
    constructor(readonly autoFlag = true, readonly autoOpen = true) {
    }

    tryProgress(game: Game) {
        let madeProgress = false;

        while (true) {
            let madeProgressThisIteration = false;

            for (let y = 0; y < game.height; y++) {
                for (let x = 0; x < game.width; x++) {
                    const cell = game.getCellAt(x, y);
                    if (!(cell instanceof OpenCell) || cell.mineCount < 1) continue;
                    
                    // Only considers a single cell at a time.
                    // TODO: consider diff with open numbers above, below, left, and right

                    const surroundingUnopened = game.getSurroundingCoordinates(x, y)
                        .map(coords => { return { coords, cell: game.getCellAt(coords.x, coords.y) as UnknownCell } })
                        .filter(s => s.cell instanceof UnknownCell);

                    if (cell.mineCount === surroundingUnopened.length) {
                        for (let i = 0; i < surroundingUnopened.length; i++) {
                            const { coords, cell: otherCell } = surroundingUnopened[i];
        
                            if (otherCell.marked) continue;

                            if (!game.tryToggleMark(coords.x, coords.y))
                                throw new Error('These coordinates should specify an unopened cell.');

                            madeProgressThisIteration = true;
                        }
                    } else {
                        const markCount = surroundingUnopened.filter(s => s.cell.marked).length;

                        if (cell.mineCount === markCount) {
                            for (let i = 0; i < surroundingUnopened.length; i++) {
                                const coords = surroundingUnopened[i].coords;

                                if (game.tryOpen(coords.x, coords.y)) 
                                    madeProgressThisIteration = true;
                            }
                        }
                    }
                }
            }

            if (madeProgressThisIteration)
                madeProgress = true;
            else
                break;
        }

        return madeProgress;
    }
}
