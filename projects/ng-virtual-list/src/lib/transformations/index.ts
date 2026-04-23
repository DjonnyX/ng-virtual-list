import { objectAsReadonly } from "../utils/object";
import { linearСarousel } from "./linear-carousel";
import { eventHorizonСarousel } from "./event-horizon-carousel";
import { carouselLinearFading } from "./linear-fading-carousel";

export const ItemTransformations = objectAsReadonly({
    EVENT_HORIZON_CAROUSEL: eventHorizonСarousel,
    LINEAR_CAROUSEL: linearСarousel,
    CAROUSEL_LINEAR_FADING: carouselLinearFading,
});
