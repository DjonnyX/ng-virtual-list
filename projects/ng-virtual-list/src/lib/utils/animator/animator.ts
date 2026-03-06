import { Easing } from './types';
import { easeLinear } from './ease';

interface IAnimatorParams {
  startValue: number;
  endValue: number;
  duration?: number;
  getPropValue?: () => number;
  transform?: (value: number) => number;
  transformIsFinished?: (value: number) => boolean;
  easingFunction?: Easing;
  onStart?: (data: IAnimatorUpdateData) => void;
  onUpdate?: (data: IAnimatorUpdateData) => void;
  onComplete?: (data: IAnimatorUpdateData) => void;
}

interface IAnimatorUpdateData {
  timestamp: number;
  delta: number;
  value: number;
}

export const DEFAULT_ANIMATION_DURATION = 500,
  ANIMATOR_MIN_TIMESTAMP = 20,
  MIN_ANIMATED_VALUE = 10;

export class Animator {
  private _animationId: number = 0;

  animate(params: IAnimatorParams) {
    const {
      startValue, endValue, duration = DEFAULT_ANIMATION_DURATION, getPropValue, easingFunction = easeLinear, transform, transformIsFinished,
      onStart, onUpdate, onComplete,
    } = params;

    this.stop();

    const startTime = performance.now();
    let isCanceled = false, prevPos = startValue, start = startValue, startPosDelta = 0, delta = 0, prevTime = startTime,
      diff = transformIsFinished !== undefined ? (endValue - start) : (endValue - start),
      diffAbs = Math.abs(Math.abs(endValue) - Math.abs(start)), cPos = 0;

    if (diffAbs < MIN_ANIMATED_VALUE) {
      cPos = prevPos = start = endValue;
    } else {
      cPos = start;
    }

    if (onStart !== undefined) {
      const data: IAnimatorUpdateData = {
        delta,
        value: cPos,
        timestamp: 0,
      };
      onStart(data);
    }

    let isFinished = false;

    const step = (currentTime: number) => {
      if (!!isCanceled) {
        return;
      }

      const cPos = getPropValue?.() || 0;
      let startDelta = 0;
      if (cPos !== prevPos) {
        startDelta = cPos - prevPos;
        startPosDelta += startDelta;
      }

      const elapsed = currentTime - startTime,
        progress = start === endValue ? 1 : Math.min(duration > 0 ? elapsed / duration : 0, 1),
        easedProgress = easingFunction(progress),
        val = startPosDelta + start + diff * easedProgress,
        currentValue = transform !== undefined ? transform(val) : val,
        t = Date.now();

      isFinished = transformIsFinished ? (transformIsFinished(currentValue) || progress === 1) : progress === 1;

      delta = currentValue - startDelta - prevPos;

      const ts = t - prevTime, timestamp = ts < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : ts;

      prevTime = t;
      prevPos = currentValue;

      if (onUpdate !== undefined) {
        const data: IAnimatorUpdateData = {
          delta,
          value: currentValue,
          timestamp,
        };
        onUpdate(data);
      }

      if (isFinished) {
        if (onComplete !== undefined) {
          const data: IAnimatorUpdateData = {
            delta,
            value: currentValue,
            timestamp,
          };
          onComplete(data);
        }
      } else {
        this._animationId = requestAnimationFrame(step);
      }
    }

    this._animationId = requestAnimationFrame(step);
  }

  stop() {
    cancelAnimationFrame(this._animationId);
  }

  dispose() {
    this.stop();
  }
}
