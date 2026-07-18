import { ANIMATOR_MIN_TIMESTAMP, DEFAULT_ANIMATION_DURATION, DEFAULT_WITH_DELTA } from './const';
import { easeLinear } from './ease';
import { IAnimatorParams, IAnimatorUpdateData } from './interfaces';

/**
 * Animator
 * @link https://github.com/DjonnyX/ng-virtual-list/blob/21.x/projects/ng-virtual-list/src/lib/utils/animator/animator.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class Animator {
  private static _nextId: number = 0;

  private _animationId: number = 0;

  get animated() { return this._animationId > -1; }

  get isAnimated() { return this.hasAnimation(this._currentId); }

  private _currentId: number = Animator._nextId;

  get id() { return this._currentId; }

  private generateId() {
    return Animator._nextId = Animator._nextId === Number.MAX_SAFE_INTEGER
      ? 0 : Animator._nextId + 1;
  }

  private _diff: number = 0;

  private _startValue: number = 0;

  private _endValue: number = 0;

  private _prevPos: number = 0;

  updateTo(end: number): boolean {
    if (this.hasAnimation()) {
      this._startValue = this._prevPos;
      this._endValue = end;
      this._diff = this._endValue - this._startValue;
      return true;
    }
    return false;
  }

  animate(params: IAnimatorParams) {
    this.stop();

    const id = this.generateId();
    this._currentId = id;

    const {
      withDelta = DEFAULT_WITH_DELTA, startValue, endValue, duration = DEFAULT_ANIMATION_DURATION,
      getPropValue, easingFunction = easeLinear, onUpdate, onComplete,
    } = params;

    this._startValue = startValue;
    this._endValue = endValue;

    const startTime = performance.now();
    let isCanceled = false, startPosDelta = 0, delta = 0, prevTime = startTime, isFinished = false;
    this._prevPos = startValue;
    this._diff = this._endValue - this._startValue;

    const step = (currentTime: number) => {
      if (id !== this._currentId) {
        isCanceled = true;
      }

      if (!!isCanceled) {
        return;
      }

      const cPos = getPropValue?.() || 0;
      let startDelta = 0;
      if (cPos !== this._prevPos) {
        startDelta = cPos - this._prevPos;
        startPosDelta += startDelta;
      }

      const elapsed = currentTime - startTime,
        progress = this._startValue === this._endValue ? 1 : Math.min(duration > 0 ? elapsed / duration : 0, 1),
        easedProgress = easingFunction(progress),
        val = (withDelta ? startPosDelta : 0) + this._startValue + this._diff * easedProgress,
        currentValue = val,
        t = performance.now();

      isFinished = progress === 1;

      delta = currentValue - startDelta - this._prevPos;

      const frameTimestamp = t - prevTime,
        actualFrameTimestamp = frameTimestamp < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : frameTimestamp;

      prevTime = t;
      this._prevPos = currentValue;

      if (isFinished) {
        this._animationId = -1;
      }

      if (onUpdate !== undefined) {
        const data: IAnimatorUpdateData = {
          id,
          delta,
          elapsed,
          value: currentValue,
          timestamp: actualFrameTimestamp,
        };
        onUpdate(data);
      }

      if (isFinished) {
        if (onComplete !== undefined) {
          const data: IAnimatorUpdateData = {
            id,
            delta,
            elapsed,
            value: currentValue,
            timestamp: actualFrameTimestamp,
          };
          onComplete(data);
        }
      } else {
        this._animationId = requestAnimationFrame(step);
      }
    }

    this._animationId = requestAnimationFrame(step);

    return this._currentId;
  }

  hasAnimation(id: number = -1) {
    if ((this._currentId === id || id === -1) && this.animated) {
      return true;
    }
    return false;
  }

  stop(id: number = -1) {
    cancelAnimationFrame(id === -1 ? this._animationId : id);
    this._animationId = -1;
  }

  dispose() {
    this.stop();
  }
}
