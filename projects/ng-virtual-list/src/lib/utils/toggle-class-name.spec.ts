import { toggleClassName } from './toggle-class-name';

describe('toggleClassName', () => {
    it('The toggle class must be present', () => {
        const CLASS = 'toggle', div = document.createElement('div');
        toggleClassName(div, CLASS);
        const isContainsToggle = div.classList.contains(CLASS);
        expect(isContainsToggle).toBeTruthy();
    });

    it('There must be no toggle class', () => {
        const CLASS = 'toggle', div = document.createElement('div');
        toggleClassName(div, CLASS);
        toggleClassName(div, CLASS);
        const isContainsToggle = div.classList.contains(CLASS);
        expect(isContainsToggle).toBeTruthy();
    });

    it('There must be no class to be removed', () => {
        const CLASS = 'toggle', REMOVING_CLASS = 'init', div = document.createElement('div');
        toggleClassName(div, CLASS, REMOVING_CLASS);
        expect(JSON.stringify(div.classList)).toEqual(JSON.stringify({ 0: CLASS }));
    });
});
