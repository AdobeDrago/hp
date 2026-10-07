/**
 * Decorates the accordion block, turning each row into a native
 * <details>/<summary> element — no JS behavior needed beyond this.
 * @param {Element} block The accordion block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [question, answer] = row.children;
    if (!question || !answer) return;

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.append(...question.childNodes);
    details.append(summary, answer);
    answer.className = 'accordion-item-body';
    row.replaceWith(details);
  });
}
