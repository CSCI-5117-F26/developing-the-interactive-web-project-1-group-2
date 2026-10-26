document.addEventListener('DOMContentLoaded', () => {
    const textFields = document.querySelectorAll('input[maxlength]');

    textFields.forEach(field => {
        const counter = field.parentElement.querySelector('.char-limit-footnote');
        const max = field.getAttribute('maxlength');

        if (counter) {
            const updateCounter = () => {
                counter.textContent = `${field.value.length}/${max}`;
            };

            updateCounter();
            field.addEventListener('input', updateCounter);
        }
    });
});