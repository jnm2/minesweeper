export type Rectangle = { x: number, y: number, width: number, height: number };

export class MinesweeperLayout {
    readonly renderSize: { width: number, height: number };
    readonly gameSize: { width: number, height: number };
    readonly cellSize: number;
    readonly minefieldBounds: Rectangle;

    constructor(renderWidth: number, renderHeight: number, gameWidth: number, gameHeight: number) {
        this.renderSize = { width: renderWidth, height: renderHeight };
        this.gameSize = { width: gameWidth, height: gameHeight };

        const outerBounds = { x: 0, y: 0, width: this.renderSize.width, height: this.renderSize.height };
        const aspect = { width: gameWidth, height: gameHeight };
        this.minefieldBounds = MinesweeperLayout.fitRectangle(aspect, outerBounds);

        this.cellSize = this.minefieldBounds.width / gameWidth;
    }

    getCellCoordinatesByMouseLocation(mouseLocation: { x: number, y: number }) {
        const x = Math.floor((mouseLocation.x - this.minefieldBounds.x) / this.cellSize);
        if (x < 0 || x >= this.gameSize.width) return null;

        const y = Math.floor((mouseLocation.y - this.minefieldBounds.y) / this.cellSize);
        if (y < 0 || y >= this.gameSize.height) return null;

        return { x, y };
    }

    getCellBorderX(cellX: number) {
        return Math.floor(this.minefieldBounds.x + this.cellSize * cellX);
    }

    getCellBorderY(cellY: number) {
        return Math.floor(this.minefieldBounds.y + this.cellSize * cellY);
    }

    getCellBounds(cellX: number, cellY: number) {
        const x = this.getCellBorderX(cellX);
        const y = this.getCellBorderY(cellY);

        return {
            x,
            y,
            width: this.getCellBorderX(cellX + 1) - x,
            height: this.getCellBorderY(cellY + 1) - y
        };
    }

    private static fitRectangle(aspect: { width: number, height: number }, outerBounds: Rectangle) {
        if (outerBounds.width * aspect.height < outerBounds.height * aspect.width) {
            var correctedHeight = outerBounds.width * aspect.height / aspect.width;

            return {
                x: 0,
                y: (outerBounds.height - correctedHeight) / 2,
                width: outerBounds.width,
                height: correctedHeight
            };
        } else {
            var correctedWidth = outerBounds.height * aspect.width / aspect.height;

            return {
                x: (outerBounds.width - correctedWidth) / 2,
                y: 0,
                width: correctedWidth,
                height: outerBounds.height
            };
        }
    }
}
