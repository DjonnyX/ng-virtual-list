import { linear } from "./linear";
import { eventHorizon } from "./event-horizon";
import { deckOfCards } from "./deck-of-cards";
import { deckOfCards3D } from "./deck-of-cards-3d";
import { swipe3D } from "./swipe-3d";

export const ItemTransformations = {
    EVENT_HORIZON: eventHorizon,
    LINEAR: linear,
    DECK_OF_CARDS: deckOfCards,
    DECK_OF_CARDS_3D: deckOfCards3D,
    SWIPE_3D: swipe3D,
};
