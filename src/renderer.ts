import { Heatmap } from './Heatmap';
import { Game, UnknownCell, OpenCell, CellCoords } from './game';
import { MinesweeperLayout, Rectangle } from './minesweeperLayout';

export class Renderer {
    private readonly game: Game;
    private readonly minefieldContainer: HTMLElement;
    private readonly context: CanvasRenderingContext2D;
    private layout!: MinesweeperLayout;
    private mouseDownCell: CellCoords | null = null;
    private isMouseCaptured = false;
    private heatmap: Heatmap | null = null;

    constructor(game: Game, minefieldContainer: HTMLElement) {
        this.game = game;

        const canvas = document.createElement('canvas');
        canvas.style.touchAction = 'manipulation';

        const context = canvas.getContext('2d');
        if (!context) throw 'Unable to obtain a 2D drawing context.';
        this.context = context;

        this.minefieldContainer = minefieldContainer;
        minefieldContainer.appendChild(canvas);

        window.addEventListener('resize', () => this.refreshCanvasLayout());
        this.refreshCanvasLayout();

        canvas.addEventListener('mousedown', ev => this.onMouseDown(ev));
        canvas.addEventListener('mousemove', ev => this.onMouseMove(ev));
        canvas.addEventListener('mouseup', ev => this.onMouseUp(ev));
        canvas.addEventListener('dblclick', ev => this.onDoubleClick(ev));
        canvas.addEventListener('contextmenu', ev => this.onContextMenu(ev), false);
    }

    private refreshCanvasLayout() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const devicePixelWidth = this.minefieldContainer.clientWidth * devicePixelRatio;
        const devicePixelHeight = this.minefieldContainer.clientHeight * devicePixelRatio;

        if (this.layout
            && this.layout.renderSize.width === devicePixelWidth
            && this.layout.renderSize.height === devicePixelHeight) {
            return;
        }

        this.layout = new MinesweeperLayout(devicePixelWidth, devicePixelHeight, this.game.width, this.game.height);
        const canvas = this.context.canvas;
        canvas.style.width = this.minefieldContainer.clientWidth + 'px';
        canvas.style.height = this.minefieldContainer.clientHeight + 'px';
        canvas.width = devicePixelWidth;
        canvas.height = devicePixelHeight;
        this.render();
    }

    private onContextMenu(ev: MouseEvent) {
        ev.preventDefault();
        if (this.game.conclusion) return;

        const coords = this.getCellByMouseLocation(ev);

        if (coords && this.game.tryToggleMark(coords.x, coords.y)) {
            this.updateHeatmap();
            this.render();
        }
    }

    private onMouseDown(ev: MouseEvent) {
        if (this.game.conclusion) return;

        if (ev.button === 0) {
            this.isMouseCaptured = true;
            this.updateMouseDownCell(ev);
        }

        // Right-click is already handled by the contextmenu event which is the only way to get long presses working in
        // touch interfaces, synced to the haptic feedback. Haven’t found a good way to distinguish right-click from
        // long press. Waiting until mouseup to mark the cell is at least consistent with how left-click behaves.
    }

    private onMouseMove(ev: MouseEvent) {
        if (this.isMouseCaptured)
            this.updateMouseDownCell(ev);
    }

    private onMouseUp(ev: MouseEvent) {
        if (ev.button === 0) {
            this.isMouseCaptured = false;

            if (this.mouseDownCell) {
                if (this.game.tryOpen(this.mouseDownCell.x, this.mouseDownCell.y))
                    this.updateHeatmap();
                this.mouseDownCell = null;
                this.render();
            }
        }
    }

    private updateHeatmap() {
        const autoFlag = false;
        const autoOpen = false;
        const alwaysShow = true;

        let anyCellOpened;
        do {
            anyCellOpened = false;

            this.heatmap = Heatmap.compute(this.game);

            if (autoFlag) {
                for (const candidate of this.heatmap.candidates) {
                    if (candidate.bombLikelihood === 1) {
                        this.game.tryToggleMark(candidate.x, candidate.y);
                    }
                }
            }

            if (autoOpen) {
                for (const candidate of this.heatmap.candidates) {
                    if (candidate.bombLikelihood === 0) {
                        this.game.tryOpen(candidate.x, candidate.y);
                        anyCellOpened = true;
                    }
                }
            }
        }
        while (anyCellOpened);

        if (!alwaysShow && this.heatmap.candidates.some(c => c.bombLikelihood === 0 || c.bombLikelihood === 1))
            this.heatmap = null;
    }

    private onDoubleClick(ev: MouseEvent) {
        if (this.game.conclusion) return;

        if (ev.button === 0) {
            const coords = this.getCellByMouseLocation(ev);

            if (coords && this.game.openSurroundingIfSatisfied(coords.x, coords.y)) {
                this.updateHeatmap();
                this.render();
            }
        }
    }

    private updateMouseDownCell(ev: MouseEvent) {
        const coords = this.getCellByMouseLocation(ev);

        if (!Renderer.areSame(coords, this.mouseDownCell)) {
            this.mouseDownCell = coords;
            this.render();
        }
    }

    private static areSame(first: CellCoords | null, second: CellCoords | null) {
        if (!first) return !second;
        if (!second) return false;
        return first.x === second.x && first.y === second.y;
    }

    private getCellByMouseLocation(ev: MouseEvent) {
        const devicePixelRatio = window.devicePixelRatio || 1;

        return this.layout.getCellCoordinatesByMouseLocation({
            x: ev.offsetX * devicePixelRatio,
            y: ev.offsetY * devicePixelRatio,
        });
    }

    render(): void {
        const { renderSize, minefieldBounds, cellSize } = this.layout;

        this.context.clearRect(0, 0, renderSize.width, renderSize.height);

        this.context.fillStyle = '#d0d0d0';
        this.context.fillRect(minefieldBounds.x, minefieldBounds.y, minefieldBounds.width, minefieldBounds.height);

        this.context.strokeStyle = '#a0a0a0';

        for (let y = 0; y < this.game.height; y++) {
            const pixelY = this.layout.getCellBorderY(y);
            this.context.beginPath();
            this.context.moveTo(minefieldBounds.x, pixelY);
            this.context.lineTo(minefieldBounds.x + minefieldBounds.width, pixelY);
            this.context.stroke();
        }

        for (let x = 0; x < this.game.width; x++) {
            const pixelX = this.layout.getCellBorderX(x);
            this.context.beginPath();
            this.context.moveTo(pixelX, minefieldBounds.y);
            this.context.lineTo(pixelX, minefieldBounds.y + minefieldBounds.height);
            this.context.stroke();
        }

        this.context.font = 'bold ' + (cellSize * 0.5) + 'px Georgia';

        for (let y = 0; y < this.game.height; y++) {
            for (let x = 0; x < this.game.width; x++) {
                this.drawCell({ x, y }, this.layout.getCellBounds(x, y), cellSize);
            }
        }
    }

    private drawCell(coords: CellCoords, cellBounds: Rectangle, cellSize: number) {
        const { x, y } = coords;

        const isMouseDown = this.mouseDownCell && this.mouseDownCell.x === x && this.mouseDownCell.y === y;

        const cell = this.game.getCellAt(x, y);

        if (cell instanceof UnknownCell) {
            if (cell.marked || !isMouseDown) {
                const borderSize = cellSize * 0.1;

                const right = cellBounds.x + cellBounds.width;
                const bottom = cellBounds.y + cellBounds.height;

                this.context.beginPath();
                this.context.moveTo(cellBounds.x, cellBounds.y);
                this.context.lineTo(cellBounds.x, bottom);
                this.context.lineTo(cellBounds.x + borderSize, bottom - borderSize);
                this.context.lineTo(cellBounds.x + borderSize, cellBounds.y + borderSize);
                this.context.lineTo(right - borderSize, cellBounds.y + borderSize);
                this.context.lineTo(right, cellBounds.y);
                this.context.closePath();
                this.context.fillStyle = '#e8e8e8';
                this.context.fill();

                this.context.beginPath();
                this.context.moveTo(right, bottom);
                this.context.lineTo(right, cellBounds.y);
                this.context.lineTo(right - borderSize, cellBounds.y + borderSize);
                this.context.lineTo(right - borderSize, bottom - borderSize);
                this.context.lineTo(cellBounds.x + borderSize, bottom - borderSize);
                this.context.lineTo(cellBounds.x, bottom);
                this.context.closePath();
                this.context.fillStyle = '#a0a0a0';
                this.context.fill();
            }

            const bombLikelihood = this.heatmap?.getBombLikelihood(x, y);
            if (bombLikelihood !== undefined && bombLikelihood !== 0 && bombLikelihood !== 1) {
                this.context.fillStyle = `hsl(${(1 - bombLikelihood) * 120} 100% 50% / 25%)`;
                this.context.fillRect(cellBounds.x, cellBounds.y, cellBounds.width, cellBounds.height);
            }
        }

        const text
            = cell instanceof UnknownCell ? (cell.marked ? '🚩' : null)
                : cell instanceof OpenCell ? (cell.mineCount !== 0 ? cell.mineCount.toString() : null)
                    : '💥';

        if (text !== null) {
            if (cell instanceof OpenCell)
                this.context.fillStyle = ['blue', 'green', '#e00', 'darkblue', 'brown', 'darkcyan', 'black', 'gray'][cell.mineCount - 1];
            else
                this.context.fillStyle = 'black';

            this.drawCenteredText(text, cellBounds);
        }
    }

    private drawCenteredText(text: string, bounds: Rectangle) {
        const metrics = this.context.measureText(text);
        this.context.textBaseline = 'middle';
        this.context.fillText(text, bounds.x + (bounds.width - metrics.width) / 2, bounds.y + bounds.height / 2);
    }
}
