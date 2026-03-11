import { GradientColorPositions } from "../../../types/gradient-color-positions";
import { ScrollerDirection, ScrollerDirections } from "../enums";

interface ICalculateScrollParams {
    direction: ScrollerDirections;
    viewportWidth: number;
    viewportHeight: number;
    contentWidth: number;
    contentHeight: number;
    startOffset: number;
    endOffset: number;
    positionX: number;
    positionY: number;
    minSize: number;
}

interface ICalculateScrollPositionParams {
    scrollSize: number;
    position: number;
}

interface ICalculateScrollMetrics {
    gradientPos: [number, number];
    size: number;
    pos: number;
}

/**
 * ScrollBox
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/14.x/projects/ng-virtual-list/src/lib/components/scroller/utils/scroll-box.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class ScrollBox {
    calculateScroll({
        direction,
        viewportWidth,
        viewportHeight,
        contentWidth,
        contentHeight,
        startOffset,
        endOffset,
        positionX,
        positionY,
        minSize,
    }: ICalculateScrollParams) {
        const isVertical = direction === ScrollerDirection.VERTICAL;
        let x = 0, y = 0, thumbPosition = 0, thumbSize = 0, thumbGradientPositions: GradientColorPositions = [0, 0];
        if (isVertical) {
            const { gradientPos, size, pos, } = this.getMetrics(positionY, viewportHeight, contentHeight, startOffset, endOffset, minSize);
            thumbGradientPositions = gradientPos;
            thumbSize = size;
            thumbPosition = pos;
        } else {
            const { gradientPos, size, pos, } = this.getMetrics(positionX, viewportWidth, contentWidth, startOffset, endOffset, minSize);
            thumbGradientPositions = gradientPos;
            thumbSize = size;
            thumbPosition = pos;
        }
        return {
            x,
            y,
            thumbSize,
            thumbPosition,
            thumbGradientPositions,
        };
    }

    private getMetrics(inputPosition: number, viewportSize: number, contentSize: number, startOffset: number, endOffset: number,
        minSize: number): ICalculateScrollMetrics {
        let thumbPosition = 0, thumbSize = 0;
        const vh = viewportSize - startOffset - endOffset, msh = vh + startOffset, ch = contentSize - startOffset - endOffset,
            ratio = ch > 0 ? vh / ch : 1, ts = vh * ratio, ats = Math.max(ts, minSize), atsDelta = ats - ts,
            rh = (ch !== 0 ? (inputPosition / ch) : 0),
            pos = startOffset + ((vh - atsDelta) * rh),
            size = ats, asp = pos, bRatio = size !== 0 ? vh / size : 0,
            aspp = -(vh !== 0 ? asp / vh : 0) * bRatio, aep = vh - (aspp + size),
            aepp = (aspp + (vh !== 0 ? (aep + size) / vh : 0) * bRatio);
        thumbSize = ats;
        thumbPosition = pos < startOffset ? pos : pos > msh ? msh : pos;
        return {
            gradientPos: [aspp, aepp],
            size,
            pos: pos < startOffset ? pos : pos > msh ? msh : pos,
        };
    }

    getScrollPositionByScrollBar({
        scrollSize,
        position,
    }: ICalculateScrollPositionParams) {
        const pos = (position * scrollSize);
        return {
            position: pos,
        };
    }
}