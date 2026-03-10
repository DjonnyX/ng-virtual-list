export const NGVL_INDEX = 'ngvl-index',
    getListElementByIndex = (index: number) => {
        return `[${NGVL_INDEX}="${index}"]`;
    },
    getListElements = () => {
        return `[${NGVL_INDEX}]`;
    };
