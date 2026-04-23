import { objectAsReadonly } from "../utils/object";
import { linearСarousel } from "./linear-carousel";
import { eventHorizonСarousel } from "./event-horizon-carousel";

export const ItemTransformations = objectAsReadonly({
    EVENT_HORIZON_CAROUSEL: eventHorizonСarousel,
    LINEAR_CAROUSEL: linearСarousel,
});
