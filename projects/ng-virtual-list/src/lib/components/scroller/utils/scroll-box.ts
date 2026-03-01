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

/**
 * ScrollBox
 * Maximum performance for extremely large lists.
 * It is based on algorithms for virtualization of screen objects.
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/18.x/projects/ng-virtual-list/src/lib/components/scroller/utils/scroll-box.ts
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
            y = positionY;
            const vh = viewportHeight - startOffset - endOffset, ch = contentHeight - startOffset - endOffset,
                ratio = ch > 0 ? vh / ch : 1, ts = vh * ratio, ats = Math.max(ts, minSize), atsDelta = ats - ts, rh = (ch !== 0 ? (y / ch) : 0),
                pos = startOffset + ((vh - atsDelta) * rh),
                size = ats, asp = pos, bRatio = size !== 0 ? vh / size : 0,
                aspp = -(vh !== 0 ? asp / vh : 0) * bRatio, aep = vh - (aspp + size),
                aepp = (aspp + (vh !== 0 ? (aep + size) / vh : 0) * bRatio);
            thumbGradientPositions[0] = aspp;
            thumbGradientPositions[1] = aepp;
            thumbSize = ats;
            thumbPosition = pos;
        } else {
            x = positionX;
            const vw = viewportWidth - startOffset - endOffset, cw = contentWidth - startOffset - endOffset,
                ratio = cw > 0 ? vw / cw : 1, ts = vw * ratio, ats = Math.max(ts, minSize), atsDelta = ats - ts, rw = (cw !== 0 ? (x / cw) : 0),
                pos = startOffset + ((vw - atsDelta) * rw),
                size = ats, asp = pos, bRatio = size !== 0 ? vw / size : 0,
                aspp = -(vw !== 0 ? asp / vw : 0) * bRatio, aep = vw - (aspp + size),
                aepp = (aspp + (vw !== 0 ? (aep + size) / vw : 0) * bRatio);
            thumbGradientPositions[0] = aspp;
            thumbGradientPositions[1] = aepp;
            thumbSize = ats;
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