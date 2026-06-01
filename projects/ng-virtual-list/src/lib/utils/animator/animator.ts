import { ANIMATOR_MIN_TIMESTAMP, DEFAULT_ANIMATION_DURATION } from './const';
import { easeLinear } from './ease';
import { IAnimatorParams, IAnimatorUpdateData } from './interfaces';

/**
 * Animator
 * @link https://github.com/DjonnyX/data-channel-router/blob/main/library/src/utils/animator/animator.ts
 * @author Evgenii Alexandrovich Grebennikov
 * @email djonnyx@gmail.com
 */
export class Animator {
  private _animationId: number = 0;

  animate(params: IAnimatorParams) {
    const {
      startValue, endValue, duration = DEFAULT_ANIMATION_DURATION, getPropValue, easingFunction = easeLinear, onUpdate, onComplete,
    } = params;

    this.stop();

    const startTime = performance.now();
    let isCanceled = false, prevPos = startValue, start = startValue, startPosDelta = 0, delta = 0, prevTime = startTime,
      diff = endValue - start;

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
        val = start + diff * easedProgress,
        currentValue = val,
        t = performance.now();

      isFinished = progress === 1;

      delta = currentValue - startDelta - prevPos;

      const ts = t - prevTime, timestamp = ts < ANIMATOR_MIN_TIMESTAMP ? ANIMATOR_MIN_TIMESTAMP : ts;

      prevTime = t;
      prevPos = currentValue;

      if (onUpdate !== undefined) {
        const data: IAnimatorUpdateData = {
          delta,
          elapsed,
          value: isFinished ? endValue : currentValue,
          timestamp,
        };
        onUpdate(data);
      }

      if (isFinished) {
        if (onComplete !== undefined) {
          const data: IAnimatorUpdateData = {
            delta,
            elapsed,
            value: endValue,
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
